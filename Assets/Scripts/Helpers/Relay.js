// -----JS CODE-----
// @input Asset.ObjectPrefab[] prefabs

/**
 * @typedef {string} UserId
 */

/**
 * @typedef {string} EntityId
 */

/**
  * @typedef {Object} Plan
  */

/**
 * @enum {string}
 */
var OPS = {
    update: "update",
    delete: "delete",
    build: "build",
    batch: "batch",
    batchEnd: "batchEnd",
    instantiate: "instantiate",
    entrance: "entrance",
    user: "user",
};

/**
 * @class
 * @param {string} id 
 */
function User(id) {
    this.id = id;
    this.displayName = null;
    this.data = {};
}

/**
 * @class
 * @param {ScriptComponent} scriptComponent 
 * @param {EntityId} id 
 * @param {Plan} state 
 * @param {string=} prefabName 
 * @param {UserId=} bindedUser 
 */
function Entity(scriptComponent, id, state, prefabName, bindedUser, ownerId) {
    
    /** @type {ScriptComponent} */
    this.scriptComponent = scriptComponent;

    // TODO: rename to object
    /** @type {SceneObject} */
    this.thing = this.scriptComponent.getSceneObject();
    
    /** @type {EntityId} */
    this.id = id;
    
    // TODO: rename to state
    /** @type {Plan} */
    this.plan = state;

    /** 
     * @type {string?} 
     */
    this.prefabName = prefabName;

    /** 
     * @type {UserId?} 
     */
    this.bindedUser = bindedUser;

    /**
     * @type {UserId?}
     */
    this.ownerId = ownerId;
    
    /**
     * @type {UserId?}
     */
    this.parentId = null;

    /**
     * @type {EntityId[]}
     */
    this.childIds = [];
    
    this.deleted = false;

    /**
     * @type {number}
     */
    this.lastUpdated = null;
}

/**
 * @class
 * @param {EntityId} id 
 */
function EntityEventWrapper(id) {
    this.id = id;

    /**
     * (who, state, timestamp)
     * @type {EventWrapper<UserId, Plan, number>}
     */
    this.onCreate = new global.EventWrapper();
    
    /**
     * (who, state, timestamp)
     * @type {EventWrapper<UserId, Plan, number>}
     */
    this.onUpdate = new global.EventWrapper();
    
    /**
     * (who, timestamp)
     * @type {EventWrapper<UserId, number, null>}
     */
    this.onDelete = new global.EventWrapper();

    /**
     * (who, data)
     * @type {KeyedEventWrapper<UserId, Plan, null>}
     */
    this.onMessage = new global.KeyedEventWrapper();
}

/**
 * @class
 */
function EventLookup() {
    /**
     * @type {Object.<string,EntityEventWrapper>}
     */
    this._wrappers = {};
}

/** 
 * @param {string} id
 * @returns {EntityEventWrapper?}
 * */
EventLookup.prototype.getWrapper = function(id) {
    var wrapper = this._wrappers[id];
    if (!wrapper) {
        wrapper = new EntityEventWrapper(id);
        this._wrappers[id] = wrapper;
    }
    return wrapper;
};

/**
 * @class
 * @param {ObjectPrefab[]=} prefabs
 */
function PrefabLookup(prefabs) {
    /** @type {Object<string, ObjectPrefab>} */
    this.prefabs = {};

    if (prefabs) {
        for (var i=0; i<prefabs.length; i++) {
            this.registerPrefab(prefabs[i]);
        }
    }
}

/**
 * 
 * @param {string} name 
 * @returns {ObjectPrefab?}
 */
PrefabLookup.prototype.getPrefabByName = function(name) {
    if (name in this.prefabs) {
        return this.prefabs[name];
    }
};

/**
 * 
 * @param {ObjectPrefab} prefab 
 */
PrefabLookup.prototype.registerPrefab = function(prefab) {
    // TODO: check for collision here
    this.prefabs[prefab.name] = prefab;
};

var api = {};

var isConnectionInitialized = false;
var isInitialized = false;
var isWaitingForUsers = false;
var isReceivingBatch = false;

/**
 * @type {EventWrapper<ConnectedLensModule.UserInfo, null, null>}
 */
var onInitialized = new global.EventWrapper();
var onUserJoined = new global.EventWrapper();

var entranceTimeoutEvent = null;

var eventLookup = new EventLookup();

/** @type {ConnectedLensModule.UserInfo} */
var myUserInfo = null;

var myUserId = "local";
var myDisplayName = "user";

function generateId() {
    return myUserId + ":" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateChildId(parentId, childId) {
    childId = childId || Math.random().toString(36).substring(2, 15);
    return parentId + ":" + childId;
}

var prefabLookup = new PrefabLookup(script.prefabs);

/**
 * 
 * @param {string} name 
 * @returns {ObjectPrefab?}
 */
function findPrefabByName(name) {
    return prefabLookup.getPrefabByName(name);
}

var us = "local";

api.us = us;

/** @type {Object.<string, Entity>} */
var entities = {};

/** @type {Object.<string, User>} */
var users = {};

var queuedMessagesToSend = [];

// Child entities with not-yet-existing parents
var orphanEntities = {};

// Updates received for non-existing objects
var pendingUpdatesToReceive = {};

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(onUpdate);

var sendApi = global.connectedController.sendStringMessage;
var encodeApi = JSON.stringify;
var decodeApi = JSON.parse;
function send(message) {
    sendApi(encodeApi(message));
}

/**
 * @returns {UserId}
 */
function getOwnUserId() {
    return myUserInfo ? myUserInfo.userId : null;
}

function getOwnDisplayName()
{
    return myUserInfo ? myUserInfo.displayName : null;
}

// TODO: calculate on user join/exit and return a bool
/**
 * @returns {boolean}
 */
function isHost() {
    var ownUserID = getOwnUserId();

    var userList = Object.keys(users); 

    userList.sort(); // TEMP

    return userList[0] === ownUserID;
}

/**
 * 
 * @param {SceneObject} sceneObject 
 * @param {EntityId} id 
 * @returns {ScriptComponent}
 */
function setId(sceneObject, id) {
    var scriptComponent = sceneObject.getComponent("Component.ScriptComponent") || sceneObject.createComponent("Component.ScriptComponent");
    scriptComponent.api.__relayId = id;
    return scriptComponent;
}

/**
 * 
 * @param {SceneObject} sceneObject 
 * @returns {string?} id
 */
function getId(sceneObject) {
    var scriptComponents = sceneObject.getComponents("Component.ScriptComponent");
    for (var i=0; i<scriptComponents.length; i++) {
        var id = getIdForScript(scriptComponents[i]);
        if (id) {
            return id;
        }
    }
    return null;
}

/**
 * 
 * @param {ScriptComponent} scriptComponent 
 * @returns {string?} id
 */
function getIdForScript(scriptComponent) {
    return scriptComponent.api.__relayId;
}

/**
 * 
 * @param {ScriptComponent} scriptComponent 
 * @param {string} id
 */
function setIdForScript(scriptComponent, id) {
    scriptComponent.api.__relayId = id;
}

/**
 * 
 * @param {EntityId} childId 
 * @param {EntityId} parentId 
 */
function registerChildWithParent(childId, parentId) {
    var parentEntity = entities[parentId];
    if (parentEntity) {
        parentEntity.childIds.push(childId);
    } else {
        global.showWarning("couldn't find parent for child: " + childId);
        var orphans = setDefault(orphanEntities, parentId, []);
        orphans.push(childId);
    }
}

/**
 * Check if any orphan entities are waiting for this parent
 * @param {EntityId} parentId 
 */
function checkOrphans(parentId) {
    var orphans = orphanEntities[parentId];
    if (orphans && orphans.length > 0) {
        global.showWarning("found backlogged children for parent: " + parentId);
        var parent = entities[parentId];
        for (var i=0; i<orphans.length; i++) {
            parent.childIds.push(orphans[i]);
        }
    }
    delete orphanEntities[parentId];
}

/**
 * Trigger any pending updates we received for this entity before it was created
 * @param {EntityId} entityId 
 */
function triggerPendingUpdates(entityId) {
    var pending = pendingUpdatesToReceive[entityId];
    if (pending) {
        delete pendingUpdatesToReceive[entityId];
        internalApplyUpdate(pending.id, pending.who, pending.plan, pending.timestamp);
    }
}

/**
 * Whether the local user is allowed to modify this entity
 * @param {Entity} entity 
 * @returns {boolean}
 */
function allowedToModifyEntity(entity) {
    return !entity.ownerId || (entity.ownerId == getOwnUserId());
}

/**
 * Whether the local user is allowed to modify this entity
 * @param {EntityId} entityId 
 * @returns {boolean}
 */
function allowedToModifyId(entityId) {
    return allowedToModifyEntity(entities[entityId]);
}

/**
 * Returns the owning user id (if one exists) of the specified entity
 * @param {EntityId} entityId 
 * @returns {UserId?}
 */
function getOwnerById(entityId) {
    return entities[entityId] ? entities[entityId].ownerId : null;
}

/**
 * Returns the id if the parent entity (if one exists) of the specified entity
 * @param {EntityId} entityId 
 * @returns {EntityId?}
 */
function getParentEntityById(entityId) {
    return entities[entityId] ? entities[entityId].parentId : null;
}

/**
 * Returns the entity (if one exists) of the specified entity ID
 * @param {EntityId} entityId 
 * @returns {Entity?}
 */
 function getEntityById(entityId) {
    return entities[entityId] ? entities[entityId] : null;
}
/**
 * Register a SceneObject or ScriptComponent as a new entity
 * @param {ScriptComponent|SceneObject} object 
 * @param {EntityId} id 
 * @param {Plan=} plan 
 * @param {string=} prefabName 
 * @param {UserId=} bindedUser 
 * @param {EntityId=} parentId 
 * @param {UserId=} ownerId 
 */
api.register = function(object, id, plan, prefabName, bindedUser, parentId, ownerId) {
    /** @type {ScriptComponent} */
    var scriptComponent;
    if (object === null) {
        global.screenLog("WARNING: TRYING TO REGISTER NULL OBJECT!");
        return;
    }
    if (object.isOfType("SceneObject")) {
        /** @type {SceneObject} */
        // @ts-ignore
        var sceneObject = object;
        scriptComponent = setId(sceneObject, id);
    } else {
        // @ts-ignore
        scriptComponent = object;
        setIdForScript(scriptComponent, id);
    }
    
    plan = plan || {};
    entities[id] = new Entity(scriptComponent, id, plan, prefabName, bindedUser, ownerId);

    if (parentId) {
        // global.log("Setting parent of " + id + " to " + parentId);
        entities[id].parentId = parentId;
        registerChildWithParent(id, parentId);
    }

    // global.screenLog("Register Entity "+prefabName+" to owner :  " + ownerId );
    checkOrphans(id);
};

/**
 * Instantiate a prefab locally and send message to do the same on other clients
 * @param {string|ObjectPrefab} prefabObj
 * @param {Plan} plan 
 * @param {boolean?} bindToLocalUser 
 * @param {boolean?} ownedByLocalUser 
 */
api.instantiate = function(prefabObj, plan, bindToLocalUser, ownedByLocalUser) {
    /** @type {ObjectPrefab} */
    var prefab;
    /** @type {string} */
    var prefabName;

    if (typeof prefabObj == "string") {
        prefabName = prefabObj;
        prefab = findPrefabByName(prefabName);
        if (!prefab) {
            global.showWarning("WARNING: could not find prefab with name : " + prefabName + ", make sure it's added to the list!");
            return null;
        }
    } else {
        prefab = prefabObj;
        if (!prefab) {
            global.showWarning("WARNING: prefab is null!");
            return null;
        }
        prefabName = prefab.name;
    }

    // create an id so remotes know to refer to the same object
    var id = generateId();

    if (plan === undefined) {
        plan = {};
    }

    var bindedUser = null;
    if (bindToLocalUser) {
        bindedUser = myUserId;
    }

    var ownerId = null;
    if (ownedByLocalUser) {
        ownerId = myUserId;
    }

    // remote
    var message = {
        op: OPS.instantiate,
        id: id,
        prefabName: prefabName,
        args: plan,
    };
    
    if (ownerId) {
        message.ownerId = ownerId;
    }

    if (bindedUser) {
        message.bindedUser = bindedUser;
    }

    send(message);

    // local
    var instance = prefab.instantiate(null);

    global.applyPlanToTransform(plan, instance.getTransform());

    api.register(instance, id, plan, prefabName, bindedUser, null, ownerId);

    var view = findMainEntityViewOnObject(instance, true);
    if (view) {
        view.networkPrefabInitialize(id, plan);
    } else {
        global.showWarning("WARNING: NO EntityView FOUND ON " + prefabName);
    }

    return instance;
};

/**
 * Returns the main EntityView on an object. This is prioritized by 1) Not being a child entity 2) ScriptComponent order on SceneObject
 * @param {SceneObject} sceneObject 
 * @param {boolean=} allowUnregistered
 * @returns {EntityView?}
 */
function findMainEntityViewOnObject(sceneObject, allowUnregistered) {
    var scripts = sceneObject.getComponents("Component.ScriptComponent");
    var best = null;
    for (var i=0; i<scripts.length; i++) {
        if (global.EntityView.isEntityView(scripts[i])) {
            /** @type {EntityView} */
            var entityView = global.EntityView.getEntityViewFromScript(scripts[i]);
            if (allowUnregistered || entityView.hasRegistered) {
                if (entityView.getParentId() === null) {
                    return entityView;
                } else {
                    best = best || entityView;
                }
            }
        }
    }
    return best;
}

/**
 * Sends remote message to update an entity with new state
 * @param {EntityId} entityId 
 * @param {Plan} plan 
 */
function updateEntity(entityId, plan) {
    var entity = entities[entityId];
    if (!entity) {
        global.showWarning("No entity found! " + entityId);
        return;
    }

    if (!allowedToModifyEntity(entity)) {
        global.showWarning("trying to modify entity not owned by you! " + entityId);
        return;
    }

    var time = getServerTime();
    // remote
    var message = {
        op: OPS.update,
        id: entityId,
        args: plan,
        time: time,
    };
    send(message);

    entity.plan = plan;
    entity.lastUpdated = time;
}

/**
 * 
 * @param {SceneObject} sceneObj 
 * @param {Plan} plan 
 */
function updateObject(sceneObj, plan) {
    var entityId = getId(sceneObj);

    if (!entityId) {
        global.showWarning("update called on object with no id");
        return;
    }

    updateEntity(entityId, plan);
}

/**
 * 
 * @param {SceneObject} sceneObject 
 */
api.delete = function(sceneObject) {
    var id = getId(sceneObject);
    deleteEntity(id);
};

/**
 * 
 * @param {EntityId} entityId 
 */
function deleteEntity(entityId) {
    // remote
    var message = {
        op: OPS.delete,
        id: entityId,
        // time: getServerTime(),
    };
    send(message);

    internalDeleteEntity(entityId, getOwnUserId());
}

/**
 * 
 * @param {SceneObject} sceneObj 
 * @param {string} messageName 
 * @param {Plan} plan 
 */
api.sendObjectMessage = function(sceneObj, messageName, plan) {
    var id = getId(sceneObj);
    api.sendEntityMessage(id, messageName, plan);
};

/**
 * 
 * @param {SceneObject} sceneObj 
 * @param {string} messageName 
 * @param {Plan} plan 
 */
api.sendObjectMessageToParent = function(sceneObj, messageName, plan) {
    var parentId = findParentId(sceneObj);
    if (parentId) {
        api.sendEntityMessage(parentId, messageName, plan);
    }
};

/**
 * 
 * @param {EntityId} id 
 * @param {string} messageName 
 * @param {Plan} plan 
 */
api.sendEntityMessage = function(id, messageName, plan) {
    var message = {
        op: messageName,
        id: id,
        args: plan,
    };
    send(message);
};

/**
 * 
 * @param {EntityId} id 
 * @param {UserId} who 
 * @param {Plan} plan 
 * @param {number} timestamp 
 */
function internalApplyUpdate(id, who, plan, timestamp) {
    if (!entities[id]) {
        var pending = pendingUpdatesToReceive[id];
        if (!pending || pending.time < timestamp) {
            var newPending = {
                id: id,
                who: who,
                plan: plan,
                timestamp: timestamp,
            };
            pendingUpdatesToReceive[id] = newPending;
            global.log("Adding pending update: ", newPending);
            return;
        } else {
            global.log("Discarding update for " + id);
            return;
        }
    }
    
    entities[id].plan = plan;
    entities[id].lastUpdated = timestamp;

    eventLookup.getWrapper(id).onUpdate.trigger(who, plan, timestamp);
}

/**
 * 
 * @param {EntityId} id 
 * @param {UserId} who 
 * @param {boolean=} notifyParent 
 */
function internalDeleteEntity(id, who, notifyParent) {
    var entity = entities[id];
    if (!entity) {
        return;
    }
    var obj = entity.thing;
    if (obj) {
        eventLookup.getWrapper(id).onDelete.trigger(who);
        // Delete any child entities
        var children = entity.childIds;
        for (var j=0; j<children.length; j++) {
            internalDeleteEntity(children[j], who, false);
        }
        children = [];

        // Notify parent entity
        if (notifyParent && entity.parentId) {
            var parent = entities[entity.parentId];
            if (parent) {
                var childIndex = parent.childIds.indexOf(id);
                if (childIndex >= 0) {
                    parent.childIds.splice(childIndex, 1);
                }
            }
        }
        
        // Destroy SceneObject
        if (isNull(obj)) {
            global.showWarning("WARNING: trying to destroy object that's already destroyed!");
        } else {
            obj.destroy();
        }
        
        // If instantiated entity, remove from list
        if (entity.prefabName) {
            delete entities[id];
        } else {
            // If scene entity, instead mark as deleted
            entities[id].deleted = true;
            entities[id].lastUpdated = getServerTime();
        }
    } else {
        global.showWarning("object not found for deletion: ", id);
    }
}

/**
 * 
 * @param {UserId} who 
 * @param {string} encodedMessage 
 */
function onMessageReceived(who, encodedMessage) {
    global.log("Received from " + who + ": " + encodedMessage);
    
    // The message is coming from ConnectedController or packets
    if (encodedMessage.length > 0 && encodedMessage[0] == "/") {
        return;
    }
    
    var ownUserID = getOwnUserId();
    var message = decodeApi(encodedMessage);
    var op = message.op;

    var update_op = function(message) {
        global.log("update_op ", message);
        var id = message.id;
        var plan = message.args;
        var timestamp = message.time;
        internalApplyUpdate(id, who, plan, timestamp);
    };
    var delete_op = function(message) {
        global.log("delete_op ", message);
        var id = message.id;
        internalDeleteEntity(id, who, true);
    };
    var instantiate_op = function(message) {
        global.log("instantiate_op ", message);
        var id = message.id;

        if (entities[id] != null) {
            global.showWarning("already instantiated object with id: " + id);
            return;
        }

        var plan = message.args;
        var name = message.prefabName;
        var bindedUser = message.bindedUser;
        var ownerId = message.ownerId;
        var timestamp = message.time;
        var parentId = message.parent;
        var prefab = findPrefabByName(name);

        if (prefab) {
            var thing = prefab.instantiate(null);
            global.applyPlanToTransform(plan, thing.getTransform());

            api.register(thing, id, plan, name, bindedUser, parentId, ownerId);
            if (timestamp) {
                entities[id].lastUpdated = timestamp;
            }
        } else {
            //!!!
            global.showWarning("could not construct given message: ", message);
        }
    };
    var custom_op = function(message) {
        var op = message.op;
        global.log("custom_op: " + op, message);
        var id = message.id;
        var plan = message.args;
        eventLookup.getWrapper(id).onMessage.trigger(op, who, plan);
    };
    var entrance_op = function(message) {
        global.log("entrance_op: ", message);
        var ownUserId = getOwnUserId();
        var userId = message.id;
        var displayName = message.displayName;
        var data = message.data;
        
        if (userId === ownUserId) {
            global.log("entrance event is for myself, bailing");
            return;
        }

        var amIHost = isHost();

        users[userId] = new User(userId);
        users[userId].displayName = displayName;
        users[userId].data = data;

        if (amIHost) {
            sendStateToUser(userId);
        }
    };
    var user_op = function(message) {
        var userId = message.id;
        var displayName = message.displayName;
        var data = message.args;
        
        var newUser = new User(userId);
        users[userId] = newUser;
        newUser.displayName = displayName;
        newUser.data = data; 
    };
    var batch_end_op = function(message) {
        global.log("batch_end_op ", message);
        if (isReceivingBatch && !isInitialized) {
            isReceivingBatch = false;
            isInitialized = true;
            if (isWaitingForUsers) {
                isWaitingForUsers = false;
                if (entranceTimeoutEvent) {
                    script.removeEvent(entranceTimeoutEvent);
                    entranceTimeoutEvent = null;
                }
            }
            onInitialized.trigger(myUserInfo);
        }
    };
    var batch_build_op;
    var build_op = function(message) {
        global.log("build_op ", message);
        var op = message.op;
        switch (op) {
            case OPS.update:
                update_op(message);
                break;
            case OPS.delete:
                delete_op(message);
                break;
            case OPS.batch:
                batch_build_op(message);
                break;
            case OPS.batchEnd:
                batch_end_op(message);
                break;
            case OPS.instantiate:
                instantiate_op(message);
                break;
            case OPS.entrance:
                entrance_op(message);
                break;
            case OPS.user:
                user_op(message);
                break;
            default:
                custom_op(message);
                break;
        }
    };
    batch_build_op = function(message) {
        global.log("batch_build_op ", message);
        isReceivingBatch = true;
        var batch = message.args.batch;
        batch.forEach(function(item) {
            build_op(item);
        });
    };

    var recipient = message.recipient;
    var doReadMessage = true;

    if (recipient !== undefined) {
        doReadMessage = recipient === ownUserID;
    }

    global.log("Recipient of this message was " + recipient + " " + doReadMessage + "  ownUserID " + ownUserID);
    
    if (doReadMessage) {
        var op = message.op;
        switch (op) {
            case OPS.update:
                update_op(message);
                break;   
            case OPS.delete:
                delete_op(message);
                break;                                           
            case OPS.build:
                build_op(message);
                break;
            case OPS.batch:
                batch_build_op(message);
                break;
            case OPS.batchEnd:
                batch_end_op(message);
                break;
            case OPS.instantiate:
                instantiate_op(message);
                break;
            case OPS.entrance:
                entrance_op(message);
                break;
            case OPS.user:
                user_op(message);
                break;
            default:
                custom_op(message);
                break;
        }
    }
}

function onUpdate(eventData) {
    if (queuedMessagesToSend.length) {
        var message = queuedMessagesToSend.shift();
        send(message);
    }
}

/**
 * 
 * @param {UserId} newUserId 
 */
function sendStateToUser(newUserId) {
    global.screenLog("*** I am host and should send state to new user " + newUserId);

    var MAX_BATCH_SIZE = 512;
    var batchList = [];

    for (var userId in users) {
        var user = users[userId];
        var userBatchItem = {
            op: OPS.user,
            id: user.id,
            displayName: user.displayName,
            args: user.data,
        };
        batchList.push(userBatchItem);

        if (batchList.length > MAX_BATCH_SIZE) {
            var userBatchCopy = batchList.slice();
            var messageId = generateId();
            var userMessage = {
                id: messageId,
                recipient: newUserId,
                op: OPS.batch,
                args: { batch: userBatchCopy }
            };
            batchList = [];     
            queuedMessagesToSend.push(userMessage);
        }
    }

    for (var thing in entities) {
        var batchItem = {op: OPS.update, id: thing, args: entities[thing].plan };
        if (entities[thing].prefabName) {
            batchItem.prefabName = entities[thing].prefabName;
            batchItem.op = OPS.instantiate;
        } else if (entities[thing].deleted) {
            batchItem.op = OPS.delete;
        }
        if (entities[thing].bindedUser) {
            batchItem.bindedUser = entities[thing].bindedUser;
        }
        if (entities[thing].ownerId)
        {
            batchItem.ownerId = entities[thing].ownerId;
        }
        if (entities[thing].lastUpdated) {
            batchItem.time = entities[thing].lastUpdated;
        }
        global.log("batching item: ", batchItem);
        batchList.push(batchItem);

        // We get kicked out of the session if we send a message that is too big, so batch up message of a reasonable size and send hem over a few frames
        if (batchList.length > MAX_BATCH_SIZE) {
            var batchCopy = batchList.slice();
            var batchMessageId = generateId();
            var message = {
                id: batchMessageId,
                recipient: newUserId,
                op: OPS.batch,
                args: { batch: batchCopy }
            };
            batchList = [];     
            queuedMessagesToSend.push(message);
        }
    }

    var finalMessageId = generateId();

    batchList.push({
        id: messageId,
        op: OPS.batchEnd,
    });
    
    var finalMessage = {
        id: finalMessageId,
        recipient: newUserId,
        op: OPS.batch,
        args: {batch: batchList}
    };

    queuedMessagesToSend.push(finalMessage);
}

/**
 * 
 * @param {ConnectedLensModule.UserInfo} localUserInfo 
 */
function onInitialConnection(localUserInfo) {
    myUserInfo = localUserInfo;
    myUserId = localUserInfo.userId;
    myDisplayName = localUserInfo.displayName;

    var data = {};
    
    // Send Entrance message to request an update from the host (if one exists)
    var message = {
        op: OPS.entrance,
        id: myUserId,
        displayName: myDisplayName,
        args: data,
    };
    send(message);
    global.screenLog("sending entrance request");

    // Start timeout timer to give up if no host responds
    isWaitingForUsers = true;
    entranceTimeoutEvent = script.createEvent("DelayedCallbackEvent");
    entranceTimeoutEvent.bind(function() {
        // Got no connections or initialization, assume we are the only user
        script.removeEvent(entranceTimeoutEvent);
        entranceTimeoutEvent = null;
        isInitialized = true;
        isWaitingForUsers = false;
        global.screenLog("Couldn't find other users, assuming we are alone");
        
        users[myUserId] = new User(myUserId);
        users[myUserId].data = data;
        users[myUserId].displayName = myDisplayName;

        onInitialized.trigger(myUserInfo);
    });
    entranceTimeoutEvent.reset(2); // Give enough time for someone else to receive & respond
}

/**
 * 
 * @param {ConnectedLensModule.UserInfo} userInfo
 */
function onNewUserJoined(userInfo) {
    var userId = userInfo.userId;
    global.screenLog("*** User Joined " + userInfo.displayName);

    onUserJoined.trigger(userInfo);

    if (isWaitingForUsers) {
        isWaitingForUsers = false;
        if (entranceTimeoutEvent) {
            script.removeEvent(entranceTimeoutEvent);
            entranceTimeoutEvent = null;
        }
        isInitialized = false;
        global.showWarning("Waiting for response to entrance message");
    }
}

/**
 * 
 * @param {ConnectedLensModule.UserInfo} userInfo
 */
function onUserLeft(userInfo) {
    var userId = userInfo.userId;
    delete users[userId];

    global.showWarning("**** User Left " + userId);

    // TODO: Should be better way to do this. Maybe each client can handle it internally without relying on host.
    if (isHost()) {
        global.showWarning("**** I am the host and should check to clean up user objects");
        var toDelete = [];
        for (var i in entities) {
            if (entities[i].bindedUser == userId && !entities[i].deleted) {
                toDelete.push(i);
            }
        }
        for (var d in toDelete) {
            var id = toDelete[d];
            global.showWarning("Cleaning up user object: " + id);
            deleteEntity(id);
        }
    }
}

/**
 * @returns {MultiplayerSession}
 */
function getSession() {
    return global.connectedController.getConnected().getMultiplayerSession();
}

/**
 * @returns {boolean}
 */
function hasSession() {
    return getSession() != null;
}

/**
 * @returns {number}
 */
function getServerTime() {
    var session = getSession();
    return session ? session.getServerTimestamp() : 0;
}


/**
 * 
 * @param {EntityId} id 
 * @returns {EntityEventWrapper}
 */
function getEventWrapperForEntity(id) {
    return eventLookup.getWrapper(id);
}

/**
 * 
 * @param {SceneObject} obj 
 * @returns {EntityEventWrapper}
 */
function getEventWrapperForObject(obj) {
    return getEventWrapperForEntity(getId(obj));
}

// TODO: search through all scriptcomponents on obj
/**
 * Find a suitable parent entity
 * @param {SceneObject} sceneObject 
 * @param {EntityId=} childId 
 * @returns {EntityId?}
 */
function findParentId(sceneObject, childId) {

    // Prioritize EntityViews
    var mainEntityView = findMainEntityViewOnObject(sceneObject);
    if (mainEntityView && mainEntityView.hasRegistered && mainEntityView.networkId !== childId) {
        return mainEntityView.networkId;
    }

    // Fallback to any regular script marked with networkId
    var id = getId(sceneObject);
    if (id && (!childId || childId !== id)) {
        return id;
    }

    // Continue checking parent
    if (sceneObject.hasParent()) {
        return findParentId(sceneObject.getParent(), childId);
    }
    return null;
}

/**
 * @param {MultiplayerSession} session
 * @param {function(ConnectedLensModule.UserInfo):void} onComplete 
 */
function getLocalUserInfo(session, onComplete) {
    /** @type ConnectedLensModule.UserInfo */
    var userInfo = {
        userId : "local",
        displayName: "unavailable",
    };

    if (isNull(session)) {
        onGetId("local");
    } else {
        session.getLocalUserId(onGetId);
    }

    function onGetId(userId) {
        userInfo.userId = userId;
        global.userContextSystem.requestDisplayName(function(name) {
            userInfo.displayName = name;
            onComplete(userInfo);
        });
    }
}

/**
 * 
 * @param {ColocateState} newState 
 */
function onConnectionStateChange(newState) {
    if (!isConnectionInitialized) {
        global.log("new state: " + newState.flowState);
        if (newState.flowState == global.FlowState.DONE) {
            isConnectionInitialized = true;
            global.connectedController.getConnected().onUserJoined(onNewUserJoined);
            global.connectedController.getConnected().onUserLeft(onUserLeft);
            global.connectedController.getConnected().onMessageReceived(onMessageReceived);
            getLocalUserInfo(getSession(), function(userInfo) {
                print("initializing connection");
                onInitialConnection(userInfo);
            });
        }
    }
}

/**
 * 
 * @param {ObjectPrefab} prefab 
 */
api.registerPrefab = function(prefab) {
    prefabLookup.registerPrefab(prefab);
};

api.users = users;
api.getIdForScript = getIdForScript;

api.getId = getId;
api.getEntityById = getEntityById;
api.findParentId = findParentId;
api.generateChildId = generateChildId;
api.triggerPendingUpdates = triggerPendingUpdates;

api.update = updateObject;
api.updateEntity = updateEntity;

api.getOwnerById = getOwnerById;
api.getParentEntityById = getParentEntityById;
api.allowedToModifyId = allowedToModifyId;

api.hasSession = hasSession;
api.getServerTime = getServerTime;

api.getLocalDisplayName = function() {
    return myDisplayName;
};

api.getOwnUserId = getOwnUserId;
api.getOwnDisplayName = getOwnDisplayName;
api.isHost = isHost;

api.eventLookup = eventLookup;
api.getEventWrapperForObject = getEventWrapperForObject;
api.getEventWrapperForEntity = getEventWrapperForEntity;

global.connectedController.onStateChange(onConnectionStateChange);

/**
 * 
 * @param {function(ConnectedLensModule.UserInfo):void} callback 
 */
api.notifyOnInitialize = function(callback) {
    onInitialized.addCallback(callback);
};

api.notifyOnNewUserJoined = function(callback){
    onUserJoined.addCallback(callback);
}

global.relay = api;

// Helpers

function setDefault(obj, key, def) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = def;
        return def;
    }
    return obj[key];
}
