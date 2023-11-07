// StorageProperties.js
// Version: 1.0.2
// Event: On Awake
// Description: Provides classes and helper functions used for storing data in RealtimeStores.


/**
 * @class
 * @extends {string}
 * @template T
 */
function StorageType() {}// eslint-disable-line no-unused-vars

/**
 * Storage types, for use with {@link StorageProperty}
 * @enum {string}
 */
var StorageTypes = {
    /** @type {StorageType<boolean>} */
    bool : "Bool",
    /** @type {StorageType<number>} */
    float : "Float",
    /** @type {StorageType<number>} */
    double : "Double",
    /** @type {StorageType<number>} */
    int : "Int",
    /** @type {StorageType<string>} */
    string : "String",
    /** @type {StorageType<vec2>} */
    vec2 : "Vec2",
    /** @type {StorageType<vec3>} */
    vec3 : "Vec3",
    /** @type {StorageType<vec4>} */
    vec4 : "Vec4",
    /** @type {StorageType<quat>} */
    quat : "Quat",
    /** @type {StorageType<mat2>} */
    mat2 : "Mat2",
    /** @type {StorageType<mat3>} */
    mat3 : "Mat3",
    /** @type {StorageType<mat4>} */
    mat4 : "Mat4",

    /** @type {StorageType<boolean>[]} */
    boolArray : "BoolArray",
    /** @type {StorageType<number[]>} */
    floatArray : "FloatArray",
    /** @type {StorageType<number[]>} */
    doubleArray : "DoubleArray",
    /** @type {StorageType<number[]>} */
    intArray : "IntArray",
    /** @type {StorageType<string[]>} */
    stringArray : "StringArray",
    /** @type {StorageType<vec2[]>} */
    vec2Array : "Vec2Array",
    /** @type {StorageType<vec3[]>} */
    vec3Array : "Vec3Array",
    /** @type {StorageType<vec4[]>} */
    vec4Array : "Vec4Array",
    /** @type {StorageType<quat[]>} */
    quatArray : "QuatArray",
    /** @type {StorageType<mat2[]>} */
    mat2Array : "Mat2Array",
    /** @type {StorageType<mat3[]>} */
    mat3Array : "Mat3Array",
    /** @type {StorageType<mat4[]>} */
    mat4Array : "Mat4Array",

    /**
     * Returns an equal check function based on `storageType`.
     * This function returns `true` if the two values of that type can be considered equal, or reasonably close to equal.
     * @template T
     * @param {StorageType<T>} storageType {@link StorageTypes StorageType} to get an equals check for
     * @returns {(a:T, b:T)=>boolean} Equals check function for the passed in {@link StorageTypes StorageType}
     */
    getEqualsCheckForStorageType: function(storageType) {
        switch (storageType) {
            case StorageTypes.float:
            case StorageTypes.double:
                return floatCompare;
            case StorageTypes.quat:
                return quatCompare;
            case StorageTypes.vec2:
            case StorageTypes.vec3:
            case StorageTypes.vec4:
                return vecCompare;
            case StorageTypes.mat2:
            case StorageTypes.mat3:
            case StorageTypes.mat4:
                return matCompare;
        }
        return null;
    },

    /**
     * Returns a lerp function based on `storageType`.
     * @template T
     * @param {StorageType<T>} storageType {@link StorageTypes StorageType} to get lerp function for
     * @returns {(a:T, b:T, t:number)=>T} Lerp function for the passed in {@link StorageTypes StorageType}
     */
    getLerpForStorageType: function(storageType) {
        switch (storageType) {
            case StorageTypes.float:
            case StorageTypes.double:
                return lerp;
            case StorageTypes.quat:
                return quatSlerp;
            case StorageTypes.vec2:
                return vec2Lerp;
            case StorageTypes.vec3:
                return vec3Lerp;
            case StorageTypes.vec4:
                return vec4Lerp;
        }
        return null;
    },

    /**
     * Returns the base StorageType (useful for Array types)
     * @template T
     * @param {StorageType<T[]>} storageType {@link StorageTypes StorageType} to find base StorageType of
     * @returns {StorageType<T>} Base {@link StorageTypes StorageType}
     */
    getBaseStorageType: function(storageType) {
        switch (storageType) {
            case StorageTypes.boolArray:
                return StorageTypes.bool;
            case StorageTypes.intArray:
                return StorageTypes.int;
            case StorageTypes.floatArray:
                return StorageTypes.float;
            case StorageTypes.doubleArray:
                return StorageTypes.double;
            case StorageTypes.stringArray:
                return StorageTypes.string;
            case StorageTypes.vec2Array:
                return StorageTypes.vec2;
            case StorageTypes.vec3Array:
                return StorageTypes.vec3;
            case StorageTypes.vec4Array:
                return StorageTypes.vec4;
            case StorageTypes.quatArray:
                return StorageTypes.quat;
            case StorageTypes.mat2Array:
                return StorageTypes.mat2;
            case StorageTypes.mat3Array:
                return StorageTypes.mat3;
            case StorageTypes.mat4Array:
                return StorageTypes.mat4;
        }
        return storageType;
    },

    /**
     * 
     * @param {StorageType} storageType 
     * @returns {boolean}
     */
    isArrayType: function(storageType) {
        var baseType = StorageTypes.getBaseStorageType(storageType);
        return baseType != storageType;
    },
};



/**
 * @template T
 * @param {string} key Key to identify and store the StorageProperty
 * @param {StorageType<T>} propertyType Use {@link StorageTypes StorageTypes}
 * @param {(SnapshotBufferOptions<T>|SnapshotBufferOptionsObj<T>)=} smoothingOptions Options for automatically applied smoothing
 */
function StorageProperty(key, propertyType, smoothingOptions) {
    
    /**
     * Key used to identify and store the property. This key matches defines how the property is accessed in a RealtimeStore.
     * It can also be used to identify the property in a {@link StoragePropertySet}.
     * @type {string}
     */
    this.key = key;
    
    /** 
     * {@link StorageType} used by the property.
     * @type {StorageType<T>} 
     */
    this.propertyType = propertyType;

    /** 
     * If defined, this function is called to automatically update the property value each frame.
     * @type {()=>T} 
     */
    this.getterFunc;
    
    /** 
     * If defined, this function is called to automatically apply the property value.
     * @type {(val:T)=>void} 
     */
    this.setterFunc;
    
    /** 
     * The function used to check for a change in the property value. It should return `true` if two values are equal, or reasonably close to equal.
     * @type {(a:T, b:T)=>boolean} 
     */
    this.equalsCheck = function(a, b) {
        return a == b; 
    };
    
    /** 
     * The current value that we believe to be synced across the network. In most simple cases, this is what you want to read from.
     * @type {T|undefined} 
     */
    this.currentValue;

    /** 
     * The local value that can potentially be sent to the network at the next available chance. It may be the same as `currentValue`, but may not be. 
     * @type {T?} 
     */
    this.pendingValue = null;

    /** 
     * The most recently changed local value, whether that's `current` or `pending`.
     * In most cases when you want a very up-to-date local value, this is what you want to read from.
     * @type {T?} 
     */
    this.currentOrPendingValue = null;

    /** 
     * Event triggered when the pending value changes.
     * @type {EventWrapper<T, T>} 
     */
    this.onPendingValueChange = new global.EventWrapper();

    /** 
     * Event triggered when the `currentValue` is changed by a remote user.
     * @type {EventWrapper<T, T, ConnectedLensModule.RealtimeStoreUpdateInfo>} 
     */
    this.onRemoteChange = new global.EventWrapper();

    /** 
     * Event triggered when the `currentValue` is changed by the local user.
     * @type {EventWrapper<T, T>} 
     */
    this.onLocalChange = new global.EventWrapper();

    /** 
     * Event triggered when the `currentValue` is changed by any user (either local or remote).
     * @type {EventWrapper<T, T, ConnectedLensModule.RealtimeStoreUpdateInfo>} 
     */
    this.onAnyChange = new global.EventWrapper();

    /** 
     * If greater than or equal to zero, this limits how often the property sends updates to the network about its value changing.
     * This is useful to avoid rate limiting when a value updates very frequently, for example if a position is changing every frame.
     * When using this feature, `currentValue` will only be updated when the value is actually sent to the network.
     * To get the most recent *local* version of a value, you can always check `currentOrPendingValue`.
     * @type {number} 
     */
    this.sendsPerSecondLimit = -1;

    /**
     * Can be used to manually mark the property dirty and skip equals check
     * @type {boolean}
     */
    this.markedDirty = false;

    /** 
     * Last time (in local seconds) that the property value was sent to the network. 
     * @private
     * @type {number?} 
     */
    this._lastSendTime = null;

    var equalCheck = StorageTypes.getEqualsCheckForStorageType(this.propertyType);
    if (equalCheck) {
        this.equalsCheck = equalCheck;
    }

    /** @type {SnapshotBuffer<T>?} */
    this._snapshotBuffer;
    this.setSmoothing(smoothingOptions);
}

/**
 * 
 * @param {(SnapshotBufferOptions<T>|SnapshotBufferOptionsObj<T>)?} smoothingOptions Options for automatically applied smoothing
 */
StorageProperty.prototype.setSmoothing = function(smoothingOptions) {
    if (smoothingOptions === null || smoothingOptions == undefined) {
        this._snapshotBuffer = null;
    } else {
        smoothingOptions.storageType = smoothingOptions.storageType || this.propertyType;
        this._snapshotBuffer = global.SnapshotBuffer.createFromOptions(smoothingOptions);
    }
};

/**
 * @private
 * @param {T} newValue New value to apply
 * @param {boolean=} dontTriggerEvents
 * @param {ConnectedLensModule.RealtimeStoreUpdateInfo=} updateInfo
 */
StorageProperty.prototype._applyRemoteValue = function(newValue, dontTriggerEvents, updateInfo) {
    var prevVal = this.currentValue;
    this.currentValue = newValue;
    if (!dontTriggerEvents) {
        this.pendingValue = newValue;
        this.currentOrPendingValue = newValue;
        
        if (this._snapshotBuffer && updateInfo && updateInfo.sentServerTimeMilliseconds) {
            this._snapshotBuffer.saveSnapshot(updateInfo.sentServerTimeMilliseconds * .001, newValue);
        }
    }
    if (this.setterFunc && !this._snapshotBuffer) {
        try {
            this.setterFunc(newValue);
        } catch (error) {
            // print("error applying value " + this.key + ": " + error);
        }
    }
    if (!dontTriggerEvents) {
        this.onRemoteChange.trigger(this.currentValue, prevVal, updateInfo);
        this.onAnyChange.trigger(this.currentValue, prevVal, updateInfo); 
    }
};

/** 
 * @private
 * @param {T} newValue 
 * @returns {boolean}
 */
StorageProperty.prototype._checkPendingValueChanged = function(newValue) {
    if (newValue !== null && (
        this.pendingValue === undefined || 
            this.pendingValue === null || 
            !this.equalsCheck(newValue, this.pendingValue)
    )) {
        var prevValue = this.pendingValue;
        this.pendingValue = newValue;
        this.currentOrPendingValue = newValue;
        this.onPendingValueChange.trigger(this.pendingValue, prevValue);
        return true;
    }
    return false;
};

/** 
 * @private
 * @param {T} newValue 
 * @returns {boolean}
 */
StorageProperty.prototype._checkCurrentValueChanged = function(newValue) {
    this.pendingValue = newValue;
    if (newValue != null && (
        this.markedDirty || 
            this.currentValue === undefined ||
            this.currentValue === null ||
            !this.equalsCheck(newValue, this.currentValue)
    )) {
        this.markedDirty = false;
        var prevValue = this.currentValue;
        this.currentValue = newValue;
        this.currentOrPendingValue = newValue;
        this.onLocalChange.trigger(this.currentValue, prevValue);
        this.onAnyChange.trigger(this.currentValue, prevValue);
        return true;
    }
    return false;
};

/**
 * Returns `true` if we are allowed to send updated values to the network based on the `sendsPerSecondLimit` and `timestamp`.
 * @param {number} timestamp
 * @returns {boolean}
 */
StorageProperty.prototype.checkWithinSendLimit = function(timestamp) {
    if (this.sendsPerSecondLimit <= 0) {
        return true;
    }
    if (this._lastSendTime === null) {
        return true;
    }
    return (this._lastSendTime + (1.0/this.sendsPerSecondLimit)) <= timestamp;
};

/**
 * @private
 * @param {number} timestamp
 * @returns {boolean}
 */
StorageProperty.prototype.checkLocalValueChanged = function(timestamp) {
    /** @type {T} */
    var newValue;
    
    if (this.getterFunc) {
        newValue = this.getterFunc();
        if (newValue !== null && newValue !== undefined) {
            this._checkPendingValueChanged(newValue);
        }
    }

    if (this.checkWithinSendLimit(timestamp)) {
        return this._checkCurrentValueChanged(this.pendingValue);
    } else {
        return false;
    }
};

/**
 * @private
 * @param {number} timeStamp Time in server seconds
 */
StorageProperty.prototype.applySnapshotSmoothing = function(timeStamp) {
    if (this._snapshotBuffer) {
        var newVal = this._snapshotBuffer.getLerpedValue(timeStamp + this._snapshotBuffer.interpolationTarget);
        if (newVal == null) {
            newVal = this.currentOrPendingValue;
        }
        if (newVal != null) {
            try {
                this.setterFunc(newVal);
            } catch (error) {
                // print("error applying value " + this.key + ": " + error);
            }
        }
    }
};


/**
 * Sets the pending value to `newValue`. This value will be sent to the network at the end of the frame,
 * as soon as it's allowed to do so (we have permission to modify the SyncEntity, and `sendsPerSecondLimit` hasn't been reached).
 * @param {T} newValue New pending value to set
 */
StorageProperty.prototype.setPendingValue = function(newValue) {
    if (this.getterFunc) {
        print("Warning: pending value will be ignored for StorageProperty with getter func! key:" + this.key);
    }
    this._checkPendingValueChanged(newValue);
};

/**
 * @private
 * @param {T} newValue 
 */
StorageProperty.prototype._silentSetCurrentValue = function(newValue) {
    this.currentValue = newValue;
    this.pendingValue = newValue;
    this.currentOrPendingValue = newValue;
};

/**
 * Immediately set the current value. Only use this if you are sure that we have permission to modify the store.
 * @param {GeneralDataStore} store
 * @param {T} newValue 
 * @returns {boolean}
 */
StorageProperty.prototype.setValueImmediate = function(store, newValue) {
    if (this._checkCurrentValueChanged(newValue)) {
        this.putCurrentValue(store);
        return true;
    }
    return false;
};

/**
 * Helper function that writes a value to a `store`, given a `key` and {@link StorageType}
 * @template T Value type
 * @param {GeneralDataStore} store Store to write value to
 * @param {string} key Key identifying the value
 * @param {StorageType<T>} propertyType {@link StorageTypes StorageType} identifying the type of value
 * @param {T} value Value to set
 */
StorageProperty.putStoreValueDynamic = function(store, key, propertyType, value) {
    var funcName = "put" + propertyType;
    try {
        store[funcName](key, value);
    } catch (error) {
        print("error putting property " + key + ", type " + propertyType + ", val: " + value + ". Error: " + error);
    }
};

/**
 * Helper function that reads a value from a `store`, given a `key` and {@link StorageType}
 * @template T Value type
 * @param {GeneralDataStore} store Store to read value from
 * @param {string} key Key identifying the value
 * @param {StorageType<T>} propertyType {@link StorageTypes StorageType} identifying the type of value
 * @returns {T} Value found (or default value if none found)
 */
StorageProperty.getStoreValueDynamic = function(store, key, propertyType) {
    var funcName = "get" + propertyType;
    var newValue = store[funcName](key);
    return newValue;
};

/**
 * @private
 * @param {GeneralDataStore} store 
 * @param {number=} timeStamp
 */
StorageProperty.prototype.putCurrentValue = function(store, timeStamp) {
    this._lastSendTime = (timeStamp === undefined) ? getTime() : timeStamp;
    StorageProperty.putStoreValueDynamic(store, this.key, this.propertyType, this.currentValue);
};

/**
 * Automatically sets the `equalsCheck` function based on `propertyType`.
 */
StorageProperty.prototype.setEqualsCheckByPropType = function() {
    var equalCheck = StorageTypes.getEqualsCheckForStorageType(this.propertyType);
    if (equalCheck) {
        this.equalsCheck = equalCheck;
    }
};

/**
 * Creates a simple `StorageProperty` that should be updated manually.
 * @template T Value type
 * @param {string} key Key to identify the property
 * @param {StorageType<T>} propertyType {@link StorageTypes StorageType} identifying the type of value
 * @param {T=} startingValue Optional starting value to assign to the property
 * @param {(SnapshotBufferOptions<T>|SnapshotBufferOptionsObj<T>)=} smoothingOptions
 * @returns {StorageProperty<T>} Newly created manual StorageProperty
 */
StorageProperty.manual = function(key, propertyType, startingValue, smoothingOptions) {
    /** @type {StorageProperty<T>} */
    var prop = new StorageProperty(key, propertyType);
    prop.setPendingValue(startingValue);
    prop.setSmoothing(smoothingOptions);
    return prop;
};

/**
 * Creates a simple `string` property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {string=} startingValue Optional starting value to assign to the property
 * @returns {StorageProperty<string>} Newly created StorageProperty
 */
StorageProperty.manualString = function(key, startingValue) {
    return StorageProperty.manual(key, StorageTypes.string, startingValue);
};

/**
 * Creates a simple `boolean` property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {boolean=} startingValue Optional starting value to assign to the property
 * @returns {StorageProperty<boolean>} Newly created StorageProperty
 */
StorageProperty.manualBool = function(key, startingValue) {
    return StorageProperty.manual(key, StorageTypes.bool, startingValue);
};

/**
 * Creates a simple `integer` property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {number=} startingValue Optional starting value to assign to the property
 * @returns {StorageProperty<number>} Newly created StorageProperty
 */
StorageProperty.manualInt = function(key, startingValue) {
    return StorageProperty.manual(key, StorageTypes.int, startingValue);
};

/**
 * Creates a simple `float` property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {number=} startingValue Optional starting value to assign to the property
 * @param {(SnapshotBufferOptions<number>|SnapshotBufferOptionsObj<number>)=} smoothingOptions
 * @returns {StorageProperty<number>} Newly created StorageProperty
 */
StorageProperty.manualFloat = function(key, startingValue, smoothingOptions) {
    return StorageProperty.manual(key, StorageTypes.float, startingValue, smoothingOptions);
};

/**
 * Creates a simple `double` property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {number=} startingValue Optional starting value to assign to the property
 * @param {(SnapshotBufferOptions<number>|SnapshotBufferOptionsObj<number>)=} smoothingOptions
 * @returns {StorageProperty<number>} Newly created StorageProperty
 */
StorageProperty.manualDouble = function(key, startingValue, smoothingOptions) {
    return StorageProperty.manual(key, StorageTypes.double, startingValue, smoothingOptions);
};

/**
 * Creates a simple {@link vec3} property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {vec3=} startingValue Optional starting value to assign to the property
 * @param {(SnapshotBufferOptions<vec3>|SnapshotBufferOptionsObj<vec3>)=} smoothingOptions
 * @returns {StorageProperty<vec3>} Newly created StorageProperty
 */
StorageProperty.manualVec3 = function(key, startingValue, smoothingOptions) {
    return StorageProperty.manual(key, StorageTypes.vec3, startingValue, smoothingOptions);
};

/**
 * Creates a simple {@link quat} property that should be updated manually.
 * @param {string} key Key to identify the property
 * @param {quat=} startingValue Optional starting value to assign to the property
 * @param {(SnapshotBufferOptions<quat>|SnapshotBufferOptionsObj<quat>)=} smoothingOptions
 * @returns {StorageProperty<quat>} Newly created StorageProperty
 */
StorageProperty.manualQuat = function(key, startingValue, smoothingOptions) {
    return StorageProperty.manual(key, StorageTypes.quat, startingValue, smoothingOptions);
};

/**
 * Creates an automatically updated `StorageProperty` based on getter and setter functions.
 * @template T Value type
 * @param {string} key Key to identify the property 
 * @param {StorageType<T>} propertyType {@link StorageTypes StorageType} identifying the type of value
 * @param {()=>T} getterFunc Function that returns the current local value for the property
 * @param {(val:T)=>void} setterFunc Function that applies incoming new values for the property
 * @param {(SnapshotBufferOptions<T>|SnapshotBufferOptionsObj<T>)=} smoothingOptions
 * @returns {StorageProperty<T>} Newly created StorageProperty
 */
StorageProperty.auto = function(key, propertyType, getterFunc, setterFunc, smoothingOptions) {
    /** @type {StorageProperty<T>} */
    var prop = new StorageProperty(key, propertyType);
    prop.getterFunc = getterFunc;
    prop.setterFunc = setterFunc;
    prop.setSmoothing(smoothingOptions);
    return prop;
};

/**
 * Creates an automatically updated `float` property based on getter and setter functions.
 * @param {string} key Key to identify the property 
 * @param {()=>number} getterFunc Function that returns the current local value for the property
 * @param {(val:number)=>void} setterFunc Function that applies incoming new values for the property
 * @param {(SnapshotBufferOptions<number>|SnapshotBufferOptionsObj<number>)=} smoothingOptions
 * @returns {StorageProperty<number>} Newly created StorageProperty
 */
StorageProperty.autoFloat = function(key, getterFunc, setterFunc, smoothingOptions) {
    return StorageProperty.auto(key, StorageTypes.float, getterFunc, setterFunc, smoothingOptions);
};

/**
 * Creates an automatically updated `float` property based on getter and setter functions.
 * @param {string} key Key to identify the property 
 * @param {()=>vec3} getterFunc Function that returns the current local value for the property
 * @param {(val:vec3)=>void} setterFunc Function that applies incoming new values for the property
 * @param {(SnapshotBufferOptions<vec3>|SnapshotBufferOptionsObj<vec3>)=} smoothingOptions
 * @returns {StorageProperty<vec3>} Newly created StorageProperty
 */
StorageProperty.autoVec3 = function(key, getterFunc, setterFunc, smoothingOptions) {
    return StorageProperty.auto(key, StorageTypes.vec3, getterFunc, setterFunc, smoothingOptions);
};

/**
 * Creates an automatically updated `float` property based on getter and setter functions.
 * @param {string} key Key to identify the property 
 * @param {()=>quat} getterFunc Function that returns the current local value for the property
 * @param {(val:quat)=>void} setterFunc Function that applies incoming new values for the property
 * @param {(SnapshotBufferOptions<quat>|SnapshotBufferOptionsObj<quat>)=} smoothingOptions
 * @returns {StorageProperty<quat>} Newly created StorageProperty
 */
StorageProperty.autoQuat = function(key, getterFunc, setterFunc, smoothingOptions) {
    return StorageProperty.auto(key, StorageTypes.quat, getterFunc, setterFunc, smoothingOptions);
};


/**
 * Creates an automatically updated property based on a target object and property name.
 * The `propName` should be the name of a property on the `target` object.
 * @template TObject Target object type
 * @template {keyof TObject} TKey Property name as type
 * @template {TObject[TKey]} TValue Value type
 * @param {string} key Key to identify the property
 * @param {TObject} target Target object to watch
 * @param {TKey} propName Name of a property on `target` that should be watched
 * @param {StorageType<TValue>} propertyType {@link StorageTypes StorageType} identifying the type of value
 * @param {(SnapshotBufferOptions<TValue>|SnapshotBufferOptionsObj<TValue>)=} smoothingOptions
 * @returns {StorageProperty<TValue>} Newly created StorageProperty
 */
StorageProperty.wrapProperty = function(key, target, propName, propertyType, smoothingOptions) {
    /** @type {StorageProperty<TValue>} */
    var storageProp = new StorageProperty(key, propertyType);
    storageProp.setterFunc = wrapPropertyWriter(target, propName);
    storageProp.getterFunc = wrapPropertyReader(target, propName);
    storageProp.setSmoothing(smoothingOptions);
    return storageProp;
};

/**
 * Creates an automatically updated property based on a target object with getter and setter function names.
 * The `getterName` and `setterName` should be the names of functions on the `target` object.
 * This is useful for Lens Studio engine objects, where you can't store direct references to their functions.
 * @template TValue Value type
 * @template TObject Target object type
 * @template {keyof TObject} GetKey Getter name as type
 * @template {keyof TObject} SetKey Setter name as type
 * @param {string} key Key to identify the property
 * @param {TObject} target Target object to watch
 * @param {GetKey} getterName Name of a function on `target` that returns the property value
 * @param {SetKey} setterName Name of a function on `target` that sets the property value
 * @param {StorageType<TValue>} propertyType {@link StorageTypes StorageType} identifying the type of value
 * @param {(SnapshotBufferOptions<TValue>|SnapshotBufferOptionsObj<TValue>)=} smoothingOptions
 * @returns {StorageProperty<TValue>} Newly created StorageProperty
 */
StorageProperty.wrapGetterSetter = function(key, target, getterName, setterName, propertyType, smoothingOptions) {
    /** @type {StorageProperty<TValue>} */
    var storageProp = new StorageProperty(key, propertyType);
    storageProp.getterFunc = wrapEngineGetter(target, getterName);
    storageProp.setterFunc = wrapEngineSetter(target, setterName);
    storageProp.setSmoothing(smoothingOptions);
    return storageProp;
};

/**
 * Creates an automatically updated property that mirrors a {@link Transform} position.
 * @param {Transform} transform {@link Transform} to watch
 * @param {boolean=} isLocal If `true`, local position will be used. If `false`, world position will be used.
 * @param {(SnapshotBufferOptions<vec3>|SnapshotBufferOptionsObj<vec3>)=} smoothingOptions
 * @returns {StorageProperty<vec3>} Newly created StorageProperty
 */
StorageProperty.forPosition = function(transform, isLocal, smoothingOptions) {
    return StorageProperty.copyPosition(transform, transform, isLocal, isLocal, smoothingOptions);
};


/**
 * Creates an automatically updated property that mirrors a {@link Transform} rotation.
 * @param {Transform} transform {@link Transform} to watch
 * @param {boolean=} isLocal If `true`, local rotation will be used. If `false`, world rotation will be used.
 * @param {(SnapshotBufferOptions<quat>|SnapshotBufferOptionsObj<quat>)=} smoothingOptions
 * @returns {StorageProperty<quat>} Newly created StorageProperty
 */
StorageProperty.forRotation = function(transform, isLocal, smoothingOptions) {
    return StorageProperty.copyRotation(transform, transform, isLocal, isLocal, smoothingOptions);
};

/**
 * Creates an automatically updated property that mirrors a {@link Transform} scale.
 * @param {Transform} transform {@link Transform} to watch
 * @param {boolean=} isLocal If `true`, local scale will be used. If `false`, world scale will be used.
 * @param {(SnapshotBufferOptions<vec3>|SnapshotBufferOptionsObj<vec3>)=} smoothingOptions 
 * @returns {StorageProperty<vec3>} Newly created StorageProperty
 */
StorageProperty.forScale = function(transform, isLocal, smoothingOptions) {
    return StorageProperty.copyScale(transform, transform, isLocal, isLocal, smoothingOptions);
};


/**
 * 
 * @param {Transform|SceneObject|Component} target
 * @returns {Transform?}
 */
function getTransformHelper(target) {
    if (!target) {
        return null;
    }
    if (target.isOfType("Transform")) {
        return target;
    }
    if (target.getTransform) {
        return target.getTransform();
    }
    return null;
}

/**
 * 
 * @param {Transform|SceneObject|Component} sourceTransform 
 * @param {Transform|SceneObject|Component} destTransform 
 * @param {boolean} sourceUseLocal 
 * @param {boolean} desUseLocal 
 * @param {(SnapshotBufferOptions<vec3>|SnapshotBufferOptionsObj<vec3>)=} smoothingOptions 
 * @returns {StorageProperty<vec3>} Newly created StorageProperty
 */
StorageProperty.copyPosition = function(sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions) {
    return makeTransformCopyProp(
        StorageTypes.vec3, "Position", "pos", 
        sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions);
};

/**
 * 
 * @param {Transform|SceneObject|Component} sourceTransform 
 * @param {Transform|SceneObject|Component} destTransform 
 * @param {boolean} sourceUseLocal 
 * @param {boolean} destUseLocal
 * @param {(SnapshotBufferOptions<quat>|SnapshotBufferOptionsObj<quat>)=} smoothingOptions 
 * @returns {StorageProperty<quat>} Newly created StorageProperty
 */
StorageProperty.copyRotation = function(sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions) {
    return makeTransformCopyProp(
        StorageTypes.quat, "Rotation", "rot", 
        sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions);
};

/**
 * 
 * @param {Transform|SceneObject|Component} sourceTransform 
 * @param {Transform|SceneObject|Component} destTransform 
 * @param {boolean} sourceUseLocal 
 * @param {boolean} destUseLocal 
 * @param {(SnapshotBufferOptions<vec3>|SnapshotBufferOptionsObj<vec3>)=} smoothingOptions 
 * @returns {StorageProperty<vec3>} Newly created StorageProperty
 */
StorageProperty.copyScale = function(sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions) {
    return makeTransformCopyProp(
        StorageTypes.vec3, "Scale", "scale", 
        sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions);
};

/**
 * @template T
 * @param {StorageType<T>} storageType 
 * @param {string} funcSuffix 
 * @param {string} key 
 * @param {Transform|SceneObject|Component} sourceTransform 
 * @param {Transform|SceneObject|Component} destTransform 
 * @param {boolean} sourceUseLocal 
 * @param {boolean} destUseLocal 
 * @param {(SnapshotBufferOptions<T>|SnapshotBufferOptionsObj<T>)=} smoothingOptions 
 * @returns {StorageProperty<T>} Newly created StorageProperty
 */
function makeTransformCopyProp(storageType, funcSuffix, key, sourceTransform, destTransform, sourceUseLocal, destUseLocal, smoothingOptions) {
    sourceTransform = getTransformHelper(sourceTransform);
    destTransform = getTransformHelper(destTransform);
    var sourceLocalMod = sourceUseLocal ? "Local" : "World";
    var destLocalMod = destUseLocal ? "Local" : "World";
    var getter = wrapEngineGetter(sourceTransform, "get" + sourceLocalMod + funcSuffix);
    var setter = wrapEngineSetter(destTransform, "set" + destLocalMod + funcSuffix);
    return StorageProperty.auto (
        key + sourceLocalMod + "_" + sourceTransform.getSceneObject().name + "_" + destTransform.getSceneObject().name,
        storageType,
        getter,
        setter,
        smoothingOptions
    );
}

/**
 * Creates an automatically updated property that mirrors a {@link Text Text component's} `text` property.
 * @param {Text} text {@link Text Text component} to watch
 * @returns {StorageProperty<string>} Newly created StorageProperty
 */
StorageProperty.forTextText = function(text) {
    /** @type {StorageProperty<string>} */
    return StorageProperty.wrapProperty(
        "text_text",
        text,
        "text",
        StorageTypes.string);
};

/**
 * Creates an automatically updated property that mirrors a value on a {@link Material Material's} `mainPass`.
 * @template T Value type
 * @param {Material} material Material to watch
 * @param {string} propertyName Name of a property on the `material`
 * @param {StorageType<T>} storageType {@link StorageTypes StorageType} identifying the type of value
 * @returns {StorageProperty<T>} Newly created StorageProperty
 */
StorageProperty.forMaterialProperty = function(material, propertyName, storageType) {
    return StorageProperty.wrapProperty(
        "mat_" + material.name + "_" +propertyName,
        material.mainPass,
        propertyName,
        storageType);
};

/**
 * Creates an automatically updated property that mirrors a value on a {@link MaterialMeshVisual MaterialMeshVisual's} `mainMaterial`.
 * There is also an option to clone the material in-place.
 * @template T Value type
 * @param {MaterialMeshVisual} visual Visual to watch
 * @param {string} propertyName Name of a property on the `visual`
 * @param {StorageType<T>} storageType {@link StorageTypes StorageType} identifying the type of value
 * @param {boolean=} clone If `true`, the material will be cloned and applied back to the visual. Useful if multiple objects use the same material
 * @returns {StorageProperty<T>} Newly created StorageProperty
 */
StorageProperty.forMeshVisualProperty = function(visual, propertyName, storageType, clone) {
    if (clone) {
        visual.mainMaterial = visual.mainMaterial.clone();
    }
    return StorageProperty.forMaterialProperty(visual.mainMaterial, propertyName, storageType);
};

/**
 * Creates an automatically updated property that mirrors the `baseColor` of a {@link MaterialMeshVisual}.
 * @param {MaterialMeshVisual} visual Visual to watch
 * @param {boolean=} clone If `true`, the material will be cloned and applied back to the visual. Useful if multiple objects use the same material
 * @returns {StorageProperty<vec4>} Newly created StorageProperty
 */
StorageProperty.forMeshVisualBaseColor = function(visual, clone) {
    return StorageProperty.forMeshVisualProperty(visual, "baseColor", StorageTypes.vec4, clone);
};


/**
 * Contains a set of {@link StorageProperty StorageProperties}.
 * @class
 * @param {StorageProperty[]} properties Optional array of {@link StorageProperty StorageProperties} to add to the StoragePropertySet
 */
function StoragePropertySet(properties) {
    /**  @type {{ [key: string]: StorageProperty }} */
    this.storageProperties = {};

    if (properties) {
        for (var i=0; i<properties.length; i++) {
            this.addProperty(properties[i]);
        }
    }
}

/**
 * Add a {@link StorageProperty} to the set. 
 * If a property already exists with the same `key`, this property's `key` will have a number appended to avoid collision, and a warning will be printed.
 * @template T Value type
 * @param {StorageProperty<T>} property {@link StorageProperty} to add
 * @returns {StorageProperty<T>} StorageProperty passed in
 */
StoragePropertySet.prototype.addProperty = function(property) {
    if (property.key in this.storageProperties) {
        var oldKey = property.key;
        property.key += "_" + Object.keys(this.storageProperties).length;
        print("warning: duplicate storage key for " + oldKey+ ". Renaming to: " + property.key);
    }
    this.storageProperties[property.key] = property;
    return property;
};

/**
 * Returns a {@link StorageProperty} from this set with a matching `propertyKey`, or `null` if none is found.
 * @param {string} propertyKey Key of the {@link StorageProperty} to search for
 * @returns {StorageProperty?} {@link StorageProperty} with a matching key, or null if none is found
 */
StoragePropertySet.prototype.getProperty = function(propertyKey) {
    if (propertyKey in this.storageProperties) {
        return this.storageProperties[propertyKey];
    }
    return null;
};

/**
 * @private
 * @param {GeneralDataStore} store 
 * @param {string} key 
 * @param {boolean=} clearPending
 * @param {boolean=} dontTriggerEvents
 * @param {ConnectedLensModule.RealtimeStoreUpdateInfo=} updateInfo
 */
StoragePropertySet.prototype.applyKeyUpdate = function(store, key, clearPending, dontTriggerEvents, updateInfo) {
    if (key in this.storageProperties) {
        var property = this.storageProperties[key];
        var newValue = StorageProperty.getStoreValueDynamic(store, key, property.propertyType);
        if (clearPending) {
            property.pendingValue = newValue;
        }
        property._applyRemoteValue(newValue, dontTriggerEvents, updateInfo);
    }
};

/**
 * @private
 * @param {GeneralDataStore} store 
 * @param {boolean=} dontTriggerEvents
 */
StoragePropertySet.prototype.initializeFromStore = function(store, dontTriggerEvents) {
    for (var key in this.storageProperties) {
        if (store.has(key)) {
            this.applyKeyUpdate(store, key, true, dontTriggerEvents);
        }
    }
};

/**
 * @private
 * @param {GeneralDataStore} store 
 */
StoragePropertySet.prototype.checkForChanges = function(store) {
    var timestamp = getTime();
    var changed = false;
    for (var key in this.storageProperties) {
        var prop = this.storageProperties[key];
        if (prop.checkLocalValueChanged(timestamp)) {
            prop.putCurrentValue(store, timestamp);
            changed = true;
        }
    }
    return changed;
};

/**
 * @returns {boolean} Returns true if any smoothing was applied
 */
StoragePropertySet.prototype.smoothingUpdate = function(timestamp) {
    for (var key in this.storageProperties) {
        var prop = this.storageProperties[key];
        if (prop._snapshotBuffer) {
            prop.applySnapshotSmoothing(timestamp);
        }
    }
};

/**
 * @private
 * @param {number} serverTimeInSeconds
 * @param {boolean} forceUpdateValues
 * @param {GeneralDataStore} store 
 */
StoragePropertySet.prototype.applyFrameUpdates = function(serverTimeInSeconds, forceUpdateValues, store) {
    var timeStamp = serverTimeInSeconds;
    for (var key in this.storageProperties) {
        var prop = this.storageProperties[key];
        if (prop._snapshotBuffer) {
            this.storageProperties[key].applySnapshotSmoothing(timeStamp);
        } else if (forceUpdateValues && store.has(key)) {
            this.applyKeyUpdate(store, key, true, true);
        }
    }
};

/**
 * @private
 * @param {GeneralDataStore} store 
 */
StoragePropertySet.prototype.forceWriteState = function(store) {
    for (var key in this.storageProperties) {
        var prop = this.storageProperties[key];
        if (prop.currentValue !== null && prop.currentValue !== undefined) {
            prop.putCurrentValue(store);
        }
    }
};

/**
 * Returns a function that returns the result of calling a function on the target object
 * @ignore
 * @template TObject Target object type
 * @template {keyof TObject} TKey Function name as type
 * @template {TObject[TKey]} TFunc Function type
 * @param {TObject} obj Target object
 * @param {TKey} funcName Name of function to call
 * @returns {TFunc} Function returning result of calling `funcName` on `obj`
 */
function wrapEngineGetter(obj, funcName) {
    return function() {
        return obj[funcName](); 
    };
}

/**
 * Returns a function that calls a function on the target object, while passing in an argument
 * @ignore
 * @template TObject Target object type
 * @template {keyof TObject} TKey Function name as type
 * @template {TObject[TKey]} TFunc Function type
 * @param {TObject} obj Target object
 * @param {TKey} funcName Name of function to call
 * @returns {TFunc} Function that calls `funcName` on `obj`, with one argument
 */
function wrapEngineSetter(obj, funcName) {
    return function(v) {
        obj[funcName](v); 
    };
}

/**
 * Returns a function that returns the current value of a property on the target object
 * @ignore
 * @template TObject Target object type
 * @template {keyof TObject} TKey Property name as type
 * @template {TObject[TKey]} TValue Property value type
 * @param {TObject} obj Target object
 * @param {TKey} propName Name of property to read from
 * @returns {()=>TValue} Function that returns the property `propName` on `obj`.
 */
function wrapPropertyReader(obj, propName) {
    return function() {
        return obj[propName];
    };
}

/**
 * Returns a function that sets the value of a property on the target object
 * @ignore
 * @template TObject Target object type
 * @template {keyof TObject} TKey Property name as type
 * @template {TObject[TKey]} TValue Property value as type
 * @param {TObject} obj Target object
 * @param {TKey} propName Name of property to write to
 * @returns {(val:TValue)=>void} Function that sets the property `propName` on `obj` to the passed in argument.
 */
function wrapPropertyWriter(obj, propName) {
    return function(v) {
        obj[propName] = v;
    };
}

/**
 * @ignore
 * @param {number} a 
 * @param {number} b 
 * @returns {boolean}
 */
function floatCompare(a, b) {
    return Math.abs(a-b) < .00001;
}

/**
 * @ignore
 * @template {vec2|vec3|vec4} T 
 * @param {T} a 
 * @param {T} b 
 * @returns {boolean}
 */
function vecCompare(a, b) {
    return (a.distance(b) < .000001);
}

/**
 * @ignore
 * @param {quat} a 
 * @param {quat} b 
 * @returns {boolean}
 */
function quatCompare(a, b) {
    return a.dot(b) >= .999999;
}

/**
 * @ignore
 * @param {mat2|mat3|mat4} a
 * @param {mat2|mat3|mat4} b
 * @returns {boolean}
 */
function matCompare(a, b) {
    return a.equal(b);
}

/**
* Returns the number between `a` and `b` determined by the ratio `t`
* @param {number} a Lower Bound
* @param {number} b Upper Bound
* @param {number} t Ratio [0-1]
* @returns {number} Number between `a` and `b` determined by ratio `t`
*/
function lerp(a, b, t) {
    return a + (b-a) * t;
}

/**
 * @ignore
 * @param {vec2} a 
 * @param {vec2} b 
 * @param {number} t
 * @returns {vec2}
 */
function vec2Lerp(a, b, t) {
    return vec2.lerp(a, b, t);
}

/**
 * @ignore
 * @param {vec3} a 
 * @param {vec3} b 
 * @param {number} t
 * @returns {vec3}
 */
function vec3Lerp(a, b, t) {
    return vec3.lerp(a, b, t);
}

/**
 * @ignore
 * @param {vec4} a 
 * @param {vec4} b 
 * @param {number} t
 * @returns {vec4}
 */
function vec4Lerp(a, b, t) {
    return vec4.lerp(a, b, t);
}

/**
 * @ignore
 * @param {quat} a 
 * @param {quat} b 
 * @param {number} t
 * @returns {quat}
 */
function quatSlerp(a, b, t) {
    return quat.slerp(a, b, t);
}

global.StorageTypes = StorageTypes;
global.StorageProperty = StorageProperty;
global.StoragePropertySet = StoragePropertySet;