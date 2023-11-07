// SessionController.js
// Version: 1.0.2
// Event: On Awake
// Description: Handles the initial connection and setup for a connected lens session.
// Provides access to the session once created, and callbacks for reacting to session events.


//@input Asset.ConnectedLensModule connectedLensModule
/** @type {ConnectedLensModule} */
var connectedLensModule = script.connectedLensModule;

//@ui {"widget":"separator", "showIf":"isColocated"}

//@input bool isColocated;
/** @type {boolean} */
var isColocated = script.isColocated;

//@ui {"widget":"label", "label":"<font color='orange'>This feature is still in development!</font>", "showIf":"isColocated"}
//@ui {"widget":"label", "label":"<font color='orange'>Make sure the map has built before the second user joins.</font>", "showIf":"isColocated"}

//@input Component.ColocatedTrackingComponent colocatedTrackingComponent {"showIf":"isColocated"}
/** @type {ColocatedTrackingComponent} */
var colocatedTrackingComponent = script.colocatedTrackingComponent;

//@input Component.DeviceTracking deviceTrackingComponent {"showIf":"isColocated"}
/** @type {DeviceTracking} */
var deviceTrackingComponent = script.deviceTrackingComponent;

//@input Component.Text colocatedStatusText {"showIf":"isColocated"}
/** @type {Text} */
var colocatedStatusText = script.colocatedStatusText;

//@input Component.MaterialMeshVisual landmarksVisual2d {"showIf":"isColocated", "label":"Landmarks 2D"}
/** @type {MaterialMeshVisual} */
var landmarksVisual2d = script.landmarksVisual2d;

//@input Component.MaterialMeshVisual landmarksVisual3d {"showIf":"isColocated", "label":"Landmarks 3D"}
/** @type {MaterialMeshVisual} */
var landmarksVisual3d = script.landmarksVisual3d;

//@ui {"widget":"separator", "showIf":"isColocated"}


//@ui {"widget":"separator", "showIf":"requireInvite"}
//@input bool requireInvite
/** @type {boolean} */
//@ui {"widget":"label", "label": "Automatically triggers \"Send Invite\" when the lens joins", "showIf":"requireInvite"}
//@ui {"widget":"label", "label": "a session, and waits for the invite response before", "showIf":"requireInvite"}
//@ui {"widget":"label", "label": "starting the experience.", "showIf":"requireInvite"}
//@ui {"widget":"label", "label":"<font color='orange'>This setting is ignored on Spectacles.</font>", "showIf":"requireInvite"}
var requireInvite = script.requireInvite;
if (global.deviceInfoSystem.isSpectacles()) {
    requireInvite = false;
}

//@ui {"widget":"separator", "showIf":"requireInvite"}


//@input bool debugLogging
/** @type {boolean} */
var debugLogging = script.debugLogging;

/**
 * @enum {number}
 */
var State = {
    NotInitialized: -1,
    Initialized: 0,
    Ready: 1,
    WaitingForInvite: 2,
};

var eventFlowState = {
    inviteSent: false,
    connected: false,
    shared: false,
    // Session Store
    isWaitingForSessionStore: false,
    // Colocated
    isColocatedSetupStarted: false,
    isColocatedSetupFinished: false,

};

/**
 * @class
 * @param {GeneralDataStore} store
 * @param {ConnectedLensModule.UserInfo} user
 * @param {ConnectedLensModule.RealtimeStoreCreationInfo} creationInfo
 */
function StoreInfo(store, user, creationInfo) {
    /** @type {GeneralDataStore} */
    this.store = store;
    /** @type {ConnectedLensModule.UserInfo} */
    this.ownerInfo = user;
    /** @type {ConnectedLensModule.RealtimeStoreCreationInfo} */
    this.creationInfo = creationInfo;
}

/** @type {State} */
var _state = State.NotInitialized;
/** @type {MultiplayerSession} */
var _session = null;

/** @type {ConnectedLensModule.UserInfo[]} */
var _users = [];
/** @type {Object.<string, ConnectedLensModule.UserInfo[]>} */
var _userIdLookup = {};
/** @type {Object.<string, ConnectedLensModule.UserInfo>} */
var _connectionIdLookup = {};

/** @type {ConnectedLensSessionOptions.SessionCreationType} */
var _sessionCreationType = false;

/** @type {string} */
var _localUserId = null;
/** @type {string} */
var _localConnectionId = null;
/** @type {string} */
var _localDisplayName = null;
/** @type {ConnectedLensModule.UserInfo} */
var _localUserInfo = null;

/** @type {GeneralDataStore[]} */
var _stores = [];
/** @type {Object.<string, StoreInfo>} */
var _storeLookup = {};

/** @type {boolean} */
var _requireSessionStore = (!!isColocated);

const SESSION_STORE_ID = "__session";
/** @type {GeneralDataStore} */
var _sessionStore;

const COLOCATED_BUILD_STATUS_KEY = "_colocated_build_status";
/** @enum {string} */
var ColocatedBuildStatus = {
    None: "none",
    Building: "building",
    Built: "built",
};

var _isReady = false;
var _hasSentReady = false;


var callbacks = {
    /**
     * @type {EventWrapper}
     */
    onReady: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, ConnectedLensSessionOptions.SessionCreationType>}
     */
    onSessionCreated: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession>}
     */
    onSessionShared: new global.EventWrapper(),
    
    /**
     * @type {EventWrapper<MultiplayerSession>}
     */
    onConnected: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, string>}
     */
    onDisconnected: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, string, string, ConnectedLensModule.UserInfo>}
     */
    onMessageReceived: new global.EventWrapper(),
    
    /**
     * @type {EventWrapper<MultiplayerSession, ConnectedLensModule.UserInfo>}
     */
    onUserJoinedSession: new global.EventWrapper(),
    
    /**
     * @type {EventWrapper<MultiplayerSession, ConnectedLensModule.UserInfo>}
     */
    onUserLeftSession: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, string, string>}
     */
    onError: new global.EventWrapper(),
    
    /**
     * @type {EventWrapper<MultiplayerSession, GeneralDataStore, ConnectedLensModule.UserInfo, ConnectedLensModule.RealtimeStoreCreationInfo>}
     */
    onRealtimeStoreCreated: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, GeneralDataStore, string, ConnectedLensModule.RealtimeStoreUpdateInfo=>}
     */
    onRealtimeStoreUpdated: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, GeneralDataStore>}
     */
    onRealtimeStoreDeleted: new global.EventWrapper(),

    /**
     * @type {EventWrapper<MultiplayerSession, GeneralDataStore, ConnectedLensModule.UserInfo>}
     */
    onRealtimeStoreOwnershipUpdated: new global.EventWrapper(),
};


function createSessionOptions() {
    var options = ConnectedLensSessionOptions.create();
    options.onSessionCreated = _onSessionCreated;
    options.onConnected = _onConnected;
    options.onDisconnected = _onDisconnected;
    options.onMessageReceived = _onMessageReceived;
    options.onUserJoinedSession = _onUserJoinedSession;
    options.onUserLeftSession = _onUserLeftSession;
    options.onError = _onError;
    options.onRealtimeStoreCreated = _onRealtimeStoreCreated;
    options.onRealtimeStoreUpdated = _onRealtimeStoreUpdated;
    options.onRealtimeStoreDeleted = _onRealtimeStoreDeleted;
    options.onRealtimeStoreOwnershipUpdated = _onRealtimeStoreOwnershipUpdated;
    return options;
}


function createSession() {
    var options = createSessionOptions();
    connectedLensModule.createSession(options);
}


/**
 * 
 * @param {MultiplayerSession} session 
 * @param {ConnectedLensSessionOptions.SessionCreationType} creationType 
 */
function _onSessionCreated(session, creationType) {
    _session = session;
    _sessionCreationType = creationType;
    callbacks.onSessionCreated.trigger(session, creationType);
}

/**
 * 
 * @param {MultiplayerSession} session 
 */
function _onSessionShared(session) {
    _session = session;
    eventFlowState.shared = true;
    callbacks.onSessionShared.trigger(session);
    checkIfReady();
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {ConnectedLensModule.ConnectionInfo} connectionInfo
 */
function _onConnected(session, connectionInfo) {
    debugLog("connected to session");
    _session = session;

    _users = [];
    _userIdLookup = {};
    _connectionIdLookup = {};

    _localUserInfo = connectionInfo.localUserInfo;
    _localDisplayName = _localUserInfo.displayName;
    _localUserId = _localUserInfo.userId;
    _localConnectionId = _localUserInfo.connectionId;

    // Track local user
    _trackUser(connectionInfo.localUserInfo);

    // Track other users
    var otherUsers = connectionInfo.externalUsersInfo;
    for (var i=0; i<otherUsers.length; i++) {
        _trackUser(otherUsers[i]);
    }
    
    // Track existing stores
    var stores = connectionInfo.realtimeStores;
    var creationInfos = connectionInfo.realtimeStoresCreationInfos;
    for (var j=0; j<creationInfos.length; j++) {
        _trackStore(stores[j], creationInfos[j].ownerInfo, creationInfos[j]);
    }
    
    eventFlowState.connected = true;
    callbacks.onConnected.trigger(_session);
    checkIfReady();
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {string} disconnectInfo 
 */
function _onDisconnected(session, disconnectInfo) {
    debugLog("disconnected from session: " + disconnectInfo);
    callbacks.onDisconnected.trigger(session, disconnectInfo);
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {string} userId 
 * @param {string} message 
 * @param {ConnectedLensModule.UserInfo} senderInfo
 */
function _onMessageReceived(session, userId, message, senderInfo) {
    callbacks.onMessageReceived.trigger(session, userId, message, senderInfo);
}



/**
 * 
 * @param {MultiplayerSession} session 
 * @param {string} code
 * @param {string} description
 */
function _onError(session, code, description) {
    global.logToScreen("error: " + code + ": " + description);
    callbacks.onError.trigger(session, code, description);
}


/**
 * 
 * @param {GeneralDataStore} store 
 * @param {ConnectedLensModule.UserInfo} userInfo
 * @param {ConnectedLensModule.RealtimeStoreCreationInfo} creationInfo
 */
function _trackStore(store, userInfo, creationInfo) {
    // TODO: remove this dependence, use new API for getting id
    //var storeId = creationInfo.storeId;
    var storeId = global.networkUtils.getNetworkIdFromStore(store);

    if (storeId !== null && storeId !== undefined && storeId !== "") {
        if (!(storeId in _storeLookup)) {
            _storeLookup[storeId] = new StoreInfo(store, userInfo, creationInfo);
            _stores.push(store);
        }
    }
}

/**
 * 
 * @param {GeneralDataStore} store 
 */
function _untrackStore(store) {
    // TODO: remove this dependence, use new API for getting id
    var storeId = global.networkUtils.getNetworkIdFromStore(store);
    
    if (storeId !== null && storeId !== undefined && storeId !== "") {
        delete _storeLookup[storeId];
        _stores = _stores.filter(function(x) { 
            return storeId != global.networkUtils.getNetworkIdFromStore(x);
        });
    }
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {GeneralDataStore} store 
 * @param {ConnectedLensModule.UserInfo} ownerInfo 
 * @param {ConnectedLensModule.RealtimeStoreCreationInfo} creationInfo
 */
function _onRealtimeStoreCreated(session, store, ownerInfo, creationInfo) {
    debugLog("_onRealtimeStoreCreated " + ownerInfo.displayName);
    _trackStore(store, ownerInfo, creationInfo);
    callbacks.onRealtimeStoreCreated.trigger(session, store, ownerInfo, creationInfo);
}


/**
 * 
 * @param {MultiplayerSession} session 
 * @param {GeneralDataStore} store 
 * @param {ConnectedLensModule.UserInfo} owner 
 * @param {ConnectedLensModule.RealtimeStoreUpdateInfo?} updateInfo
 */
function _onRealtimeStoreUpdated(session, store, key, updateInfo) {
    callbacks.onRealtimeStoreUpdated.trigger(session, store, key, updateInfo);
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {GeneralDataStore} store 
 */
function _onRealtimeStoreDeleted(session, store) {
    _untrackStore(store);
    callbacks.onRealtimeStoreDeleted.trigger(session, store);
}


/**
 * 
 * @param {MultiplayerSession} session 
 * @param {GeneralDataStore} store 
 * @param {ConnectedLensModule.UserInfo} owner 
 */
function _onRealtimeStoreOwnershipUpdated(session, store, owner) {
    _trackStore(store, owner);
    callbacks.onRealtimeStoreOwnershipUpdated.trigger(session, store, owner);
}

/**
 * Helper function to add a UserInfo to a list of UserInfo, only if the list doesn't contain a user with
 * matching connectionId. Returns true if the user was added to the list.
 * @param {ConnectedLensModule.UserInfo[]} userList
 * @param {ConnectedLensModule.UserInfo} newUser  
 * @returns {boolean}
 */
function _addMissingUserToListByConnectionId(userList, newUser) {
    if (newUser === null || newUser === undefined || newUser.connectionId === null || newUser.connectionId === undefined) {
        return;
    }

    var newConnectionId = newUser.connectionId;
    for (var i=0; i<userList.length; i++) {
        if (userList[i].connectionId === newConnectionId) {
            return false;
        }
    }

    userList.push(newUser);
    return true;
}

/**
 * 
 * @param {ConnectedLensModule.UserInfo} userInfo 
 * @returns {boolean}
 */
function _trackUser(userInfo) {
    var newUserJoined = false;
    if (!(userInfo.connectionId in _connectionIdLookup)) {
        _connectionIdLookup[userInfo.connectionId] = userInfo;
        newUserJoined = true;
    }

    var userList = _userIdLookup[userInfo.userId];
    if (!userList) {
        userList = [userInfo];
        _userIdLookup[userInfo.userId] = userList;
        newUserJoined = true;
    } else {
        newUserJoined = _addMissingUserToListByConnectionId(userList, userInfo) || newUserJoined;
    }

    newUserJoined = _addMissingUserToListByConnectionId(_users, userInfo) || newUserJoined;

    return newUserJoined;
}

/**
 * Helper function to remove all instances of UserInfo with matching connectionId from a list.
 * Returns the list with users removed.
 * @param {ConnectedLensModule.UserInfo[]} userList 
 * @param {ConnectedLensModule.UserInfo} userInfo
 * @returns {ConnectedLensModule.UserInfo[]}
 */
function _removeUserFromListByConnectionId(userList, userInfo) {
    if (userInfo === null || userInfo === undefined || userInfo.connectionId === null || userInfo.connectionId === undefined) {
        return userList;
    }
    var connectionId = userInfo.connectionId;
    return userList.filter(function(u) {
        return u.connectionId !== connectionId;
    });
}

/**
 * 
 * @param {ConnectedLensModule.UserInfo} userInfo 
 */
function _untrackUser(userInfo) {
    var connectionId = userInfo.connectionId;

    delete _connectionIdLookup[connectionId];

    var userList = _userIdLookup[userInfo.userId];
    if (userList) {
        _userIdLookup[userInfo] = _removeUserFromListByConnectionId(userList, userInfo);
    }

    _users = _removeUserFromListByConnectionId(_users, userInfo);
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {ConnectedLensModule.UserInfo} userInfo 
 */
function _onUserJoinedSession(session, userInfo) {
    if (_trackUser(userInfo)) {
        debugLog("user joined session: " + userInfo.displayName);
        callbacks.onUserJoinedSession.trigger(session, userInfo);
    } else {
        debugLog("skipping duplicate user: " + userInfo.displayName);
    }
}

/**
 * 
 * @param {MultiplayerSession} session 
 * @param {ConnectedLensModule.UserInfo} userInfo 
 */
function _onUserLeftSession(session, userInfo) {
    _untrackUser(userInfo);
    callbacks.onUserLeftSession.trigger(session, userInfo);
}

// Session Store

/**
 * Returns the shared session store (if exists) or null. Useful for needed session info like colocated build status.
 * @returns {GeneralDataStore?}
 */
function getSessionStore() {
    if (!_sessionStore) {
        var sessionInfo = getStoreInfoById(SESSION_STORE_ID);
        if (sessionInfo) {
            _sessionStore = sessionInfo.store;
        }
    }
    return _sessionStore;
}

function createSessionStore() {
    var storeOpts = RealtimeStoreCreateOptions.create();
    storeOpts.persistence = RealtimeStoreCreateOptions.Persistence.Persist;

    var startingStore = GeneralDataStore.create();
    // Set network ID
    global.networkUtils.putNetworkIdToStore(startingStore, SESSION_STORE_ID);
    // Set colocated build status
    startingStore.putString(COLOCATED_BUILD_STATUS_KEY, ColocatedBuildStatus.None);
    storeOpts.initialStore = startingStore;

    debugLog("creating the session store");

    createStore(storeOpts, function(store) {
        debugLog("created session store");
        _sessionStore = store;
        checkIfReady();
    }, function(message) {
        warningLog("error creating shared store: " + message);
    });
}

function waitAndCreateSessionStore() {
    waitUntilTrue(
        getSessionStore,
        function() {
            debugLog("found session store");
            checkIfReady();
        },
        // Timeout
        .1, createSessionStore
    );
}

// Colocated Flow

/**
 * Start setting up Colocated flow
 */
function startColocated() {
    debugLog("startColocated()");
    eventFlowState.isColocatedSetupStarted = true;
    if (!colocatedTrackingComponent) {
        throw ("Colocated Tracking Component must be set!");
    }

    colocatedTrackingComponent.enabled = true;
    
    var isSpectacles = global.deviceInfoSystem.isSpectacles();
    if (landmarksVisual2d) {
        landmarksVisual2d.enabled = !isSpectacles;
    }
    if (landmarksVisual3d) {
        landmarksVisual3d.enabled = !!isSpectacles;
    }

    // First, try to join any existing colocated session
    joinExistingColocated();
    
    // Check the shared session store to see if map building has already been completed
    var colocatedStatus = getColocatedBuildStatus();
    switch (colocatedStatus) {
        case ColocatedBuildStatus.None:
            // No one has built mapping yet, we should start building
            debugLog("build status is none, let's build!");
            createNewColocatedSession();
            break;
        case ColocatedBuildStatus.Building:
            // Building is in progress, we should wait for it to finish
            // TODO: Currently not implemented, see note in createNewColocatedSession()
            // TODO: need to monitor if current builder leaves the session
            debugLog("Building is in progress, let's wait!");
            break;
        case ColocatedBuildStatus.Built:
            // Someone has completed mapping, we just need to wait for the download success callback
            debugLog("Building is finished, let's wait for download!");
            break;
        default:
            debugLog("Unknown status: " + colocatedStatus);
            break;
    }
}

/**
 * Create a new Colocated session and start mapping
 */
function createNewColocatedSession() {
    debugLog("createNewColocatedSession");

    // We already have a session available, no need to build mapping
    if (colocatedTrackingComponent.canTrack) {
        debugLog("User joined colocated session. Don't need to build");
        eventFlowState.isColocatedSetupFinished = true;
        checkIfReady();
        return;
    }
    
    colocatedTrackingComponent.onTrackingAvailable.add(function() {
        debugLog("Successfully constructed and uploaded map, can now track");
        setColocatedBuildStatus(ColocatedBuildStatus.Built);
        eventFlowState.isColocatedSetupFinished = true;
        checkIfReady();
    });
    colocatedTrackingComponent.onBuildFailed.add(function() {
        warningLog("Map could not be built, probably want to try again");
    });

    debugLog("start building");
    colocatedTrackingComponent.startBuilding(_session);
    
    // TODO: We can mark this as 'building' once we've implemented fallbacks for build not going through
    // Currently, if anything goes wrong the session would be in a permanent state of "Building" and couldn't be recovered!
    // setColocatedBuildStatus(ColocatedBuildStatus.Building);

    // Update the colocated status UI text - useful for debugging, and a temporary placeholder for better UI
    if (colocatedStatusText) {
        colocatedStatusText.getSceneObject().enabled = true;
        waitUntilTrue(
            function() {
                var txt = "";
                txt += "Building map.\nLook around!\n";
                txt += "Progress: " +(colocatedTrackingComponent.buildingProgress * 100).toFixed(1) + "%";
                colocatedStatusText.text = txt;
                if (!colocatedTrackingComponent.isBuilding) {
                    return true;
                }
            },
            function() {
                colocatedStatusText.getSceneObject().enabled = false;
            }
        );
    }
}

/**
 * Try joining an existing colocated session
 */
function joinExistingColocated() {
    debugLog("joinExistingColocated()");
    colocatedTrackingComponent.onTrackingAvailable.add(function() {
        debugLog("Successfully downloaded map, can now track");
        if (deviceTrackingComponent) {
            deviceTrackingComponent.enabled = false;
        }
        eventFlowState.isColocatedSetupFinished = true;
        checkIfReady();
    });
    colocatedTrackingComponent.onJoinFailed.add(function() {
        warningLog("No map was downloaded for session");
    });
    colocatedTrackingComponent.join(_session);
}

/**
 * Get the build status from the shared session store
 * @returns {ColocatedBuildStatus}
 */
function getColocatedBuildStatus() {
    return getSessionStore().getString(COLOCATED_BUILD_STATUS_KEY);
}

/**
 * Write the build status to the shared session store
 * @param {ColocatedBuildStatus} status
 */
function setColocatedBuildStatus(status) {
    getSessionStore().putString(COLOCATED_BUILD_STATUS_KEY, status);
}

// General flow

/**
 * Checks the current status of all required systems and runs through the steps needed to finish setup.
 */
function checkIfReady() {
    // We need a session to continue
    if (!_session) {
        return;
    }

    // We need local user info to continue
    if (!_localUserId) {
        return;
    }

    // We need to be connected to the session to continue
    if (!eventFlowState.connected) {
        return;
    }

    // If requireInvite is enabled, and we are not joiners in the session, we need to send an invite before continuing
    if ((requireInvite && !eventFlowState.shared) && (_sessionCreationType != ConnectedLensSessionOptions.SessionCreationType.MultiplayerReceiver)) {
        // Send an invite if we haven't already
        if (_state != State.WaitingForInvite) {
            _state = State.WaitingForInvite;
            shareInvite();
        }
        return;
    }

    // If we require SessionStore, wait for SessionStore to be setup before continuing
    if (_requireSessionStore && !getSessionStore()) {
        // Start setting up SessionStore if we haven't already
        if (!eventFlowState.isWaitingForSessionStore) {
            eventFlowState.isWaitingForSessionStore = true;
            waitAndCreateSessionStore();
        }
        return;
    }

    

    // If we are in colocated flow, we need colocated setup to be finished before continuing
    if (isColocated) {
        if (!eventFlowState.isColocatedSetupFinished) {
            if (!eventFlowState.isColocatedSetupStarted) {
                startColocated();
                checkIfReady();
                return;
            }
            return;
        }
    }

    debugLog("session is now ready, triggering ready events");
    
    _state = State.Ready;

    // Mark as ready and send all onReady events if we haven't already
    if (!_hasSentReady) {
        _isReady = true;
        _hasSentReady = true;
        if (global.behaviorSystem) {
            global.behaviorSystem.sendCustomTrigger("session_ready");
        }
        callbacks.onReady.trigger();
    }
}

// Start setup
function init() {
    if (colocatedStatusText) {
        colocatedStatusText.getSceneObject().enabled = false;
    }
    debugLog("binding ConnectedLensEnteredEvent");
    script.createEvent("ConnectedLensEnteredEvent").bind(createSession);
    _state = State.Initialized;
}




/*
 * Public API Functions
 */

/**
 * Returns the current {@link MultiplayerSession}. Returns null if the session doesn't exist yet.
 * @returns {MultiplayerSession?}
 */
function getSession() {
    return _session;
}

/**
 * Returns the current state. 
 * @returns {State}
 */
function getState() {
    return _state;
}

/**
 * Returns the session creation type
 * @returns {ConnectedLensSessionOptions.SessionCreationType}
 */
function getSessionCreationType() {
    return _sessionCreationType;
}

/**
 * Returns the local user id, or null
 * @returns {string?}
 */
function getLocalUserId() {
    return _localUserId;
}

/**
 * Returns the local connection id, or null
 * @returns {string?}
 */
function getLocalConnectionId() {
    return _localConnectionId;
}

/**
 * Returns the local display name, or null
 * @returns {string?}
 */
function getLocalUserName() {
    return _localDisplayName;
}

/**
 * Returns the local user info, or null
 * @returns {ConnectedLensModule.UserInfo}
 */
function getLocalUserInfo() {
    return _localUserInfo;
}

/**
 * Returns true if the passed in `userInfo` matches the local userId. Note that this is separate from connectionId.
 * @param {ConnectedLensModule.UserInfo} userInfo 
 * @returns {boolean}
 */
function isSameUserAsLocal(userInfo) {
    return _localUserInfo && (_localUserId == userInfo.userId);
}

/**
 * Returns true if the passed in `userInfo` matches the local user and connection
 * @param {ConnectedLensModule.UserInfo} userInfo 
 * @returns {boolean}
 */
function isLocalUserConnection(userInfo) {
    return _localUserInfo && userInfo && (_localConnectionId == userInfo.connectionId);
}

/**
 * Returns the list of current user connections
 * @returns {ConnectedLensModule.UserInfo[]}
 */
function getUsers() {
    return _users;
}

/**
 * Returns the user info with matching id, or null
 * @deprecated Use {@link getUserByConnectionId} or {@link getUsersByUserId()}
 * @param {string} userId 
 * @returns {ConnectedLensModule.UserInfo?}
 */
function getUserById(userId) {
    var users = getUsersByUserId(userId);
    if (users.length > 0) {
        return users[0];
    }
    return null;
}

/**
 * Returns the user info with matching connection id, or null
 * @param {string} connectionId
 * @returns {ConnectedLensModule.UserInfo?}
 */
function getUserByConnectionId(connectionId) {
    return _connectionIdLookup[connectionId] || null;
}

/**
 * Returns the list of users with matching user id
 * @param {string} userId 
 * @returns {ConnectedLensModule.UserInfo[]}
 */
function getUsersByUserId(userId) {
    return _userIdLookup[userId] || [];
}

/**
 * Returns true if the session has been shared
 * @returns {boolean}
 */
function getIsSessionShared() {
    return eventFlowState.shared;
}

/**
 * Returns StoreInfo for the store with matching id
 * @param {string} networkId 
 * @returns {StoreInfo?}
 */
function getStoreInfoById(networkId) {
    return _storeLookup[networkId];
}

/**
 * Create a RealtimeStore
 * @param {RealtimeStoreCreateOptions} storeOptions 
 * @param {((store:GeneralDataStore)=>void)=} onSuccess
 * @param {((message:string)=>void)=} onError
 */
function createStore(storeOptions, onSuccess, onError) {
    _session.createRealtimeStore(
        storeOptions,
        onSuccess || function() {},
        onError || function(message) {
            throw Error(message); 
        }
    );
}

/**
 * 
 * @returns {number?}
 */
function getServerTimeInSeconds() {
    if (_session) {
        return _session.getServerTimestamp() * .001;
    }
    return null;
}

/**
 * Share an Invite to the session
 */
function shareInvite() {
    if (!_session) {
        throw Error("Unable to share invite: session is not created!");
    }
    if (!script.connectedLensModule) {
        throw Error("Unable to share invite: connected lens module not set!");
    }
    if (_state != State.Ready && _state != State.WaitingForInvite) {
        throw Error("Unable to share invite: session controller is not ready!");
    }
  
    eventFlowState.connected = false;
    eventFlowState.shared = false;

    connectedLensModule.shareSession(
        ConnectedLensModule.SessionShareType.Invitation,
        _onSessionShared
    );
}

/**
 * Returns true if the session has finished setting up and the len experience is ready to start
 * @returns {boolean}
 */
function getIsReady() {
    return _isReady;
}


/**
 * Executes `onReady` immediately if the Session is ready, or will execute it later when the Session becomes ready.
 * @param {()=>void} onReady 
 */
function notifyOnReady(onReady) {
    if (getIsReady()) {
        onReady();
    } else {
        callbacks.onReady.add(onReady);
    }
}

// Script API
script.getSession = getSession;
script.getState = getState;
script.getSessionCreationType = getSessionCreationType;
script.getLocalUserId = getLocalUserId;
script.getLocalConnectionId = getLocalConnectionId;
script.getLocalUserName = getLocalUserName;
script.getLocalUserInfo = getLocalUserInfo;
script.isSameUserAsLocal = isSameUserAsLocal;
script.isLocalUserConnection = isLocalUserConnection;
script.getUserById = getUserById;
script.getUserByConnectionId = getUserByConnectionId;
script.getUsersByUserId = getUsersByUserId;
script.getStoreInfoById = getStoreInfoById;
script.getUsers = getUsers;
script.getIsSessionShared = getIsSessionShared;
script.shareInvite = shareInvite;
script.getIsReady = getIsReady;
script.notifyOnReady = notifyOnReady;
script.getServerTimeInSeconds = getServerTimeInSeconds;

// Callbacks in script api
script.onReady = callbacks.onReady;
script.onSessionCreated = callbacks.onSessionCreated;
script.onSessionShared = callbacks.onSessionShared;
script.onConnected = callbacks.onConnected;
script.onDisconnected = callbacks.onDisconnected;
script.onMessageReceived = callbacks.onMessageReceived;
script.onUserJoinedSession = callbacks.onUserJoinedSession;
script.onUserLeftSession = callbacks.onUserLeftSession;
script.onError = callbacks.onError;
script.onRealtimeStoreCreated = callbacks.onRealtimeStoreCreated;
script.onRealtimeStoreUpdated = callbacks.onRealtimeStoreUpdated;
script.onRealtimeStoreDeleted = callbacks.onRealtimeStoreDeleted;
script.onRealtimeStoreOwnershipUpdated = callbacks.onRealtimeStoreOwnershipUpdated;


// Global API (preferred)
global.sessionController = {
    getSession: getSession,
    getState: getState,
    getSessionCreationType: getSessionCreationType,
    getLocalUserId: getLocalUserId,
    getLocalConnectionId: getLocalConnectionId,
    getLocalUserName: getLocalUserName,
    getLocalUserInfo: getLocalUserInfo,
    isSameUserAsLocal: isSameUserAsLocal,
    isLocalUserConnection: isLocalUserConnection,
    getUserById: getUserById,
    getStoreInfoById: getStoreInfoById,
    getUsers: getUsers,
    getUsersByUserId: getUsersByUserId,
    getUserByConnectionId: getUserByConnectionId,
    getIsSessionShared: getIsSessionShared,
    shareInvite: shareInvite,
    getIsReady: getIsReady,
    notifyOnReady: notifyOnReady,
    getServerTimeInSeconds: getServerTimeInSeconds,
    
    // Callbacks in single place for compatibility
    /** @deprecated */
    callbacks: callbacks,

    // Callbacks listed out individually
    onReady: callbacks.onReady,
    onSessionCreated: callbacks.onSessionCreated,
    onSessionShared: callbacks.onSessionShared,
    onConnected: callbacks.onConnected,
    onDisconnected: callbacks.onDisconnected,
    onMessageReceived: callbacks.onMessageReceived,
    onUserJoinedSession: callbacks.onUserJoinedSession,
    onUserLeftSession: callbacks.onUserLeftSession,
    onError: callbacks.onError,
    onRealtimeStoreCreated: callbacks.onRealtimeStoreCreated,
    onRealtimeStoreUpdated: callbacks.onRealtimeStoreUpdated,
    onRealtimeStoreDeleted: callbacks.onRealtimeStoreDeleted,
    onRealtimeStoreOwnershipUpdated: callbacks.onRealtimeStoreOwnershipUpdated,
};

init();

function debugLog(message) {
    if (debugLogging) {
        if (global.logToScreen) {
            global.logToScreen(message);
        } else {
            print(message);
        }
    }
}

function warningLog(message) {
    if (global.logToScreen) {
        global.logToScreen(message);
    } else {
        print(message);
    }
}

/**
 * 
 * @param {()=>boolean} condition 
 * @param {()=>void} callback 
 * @param {number=} timeOutSeconds
 * @param {(()=>void)=} onTimeout
 */
function waitUntilTrue(condition, callback, timeOutSeconds, onTimeout) {
    var startTime = getTime();
    var evt = script.createEvent("UpdateEvent");
    evt.bind(function() {
        if (condition()) {
            script.removeEvent(evt);
            callback();
        } else {
            if (timeOutSeconds !== undefined && timeOutSeconds !== null) {
                if (startTime + timeOutSeconds <= getTime()) {
                    script.removeEvent(evt);
                    onTimeout();
                }
            }
        }
    });
}