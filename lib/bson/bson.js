var Long = require('./long').Long
  , Double = require('./double').Double
  , Timestamp = require('./timestamp').Timestamp
  , ObjectID = require('./objectid').ObjectID
  , Symbol = require('./symbol').Symbol
  , Code = require('./code').Code
  , MinKey = require('./min_key').MinKey
  , MaxKey = require('./max_key').MaxKey
  , DBRef = require('./db_ref').DBRef
  , Binary = require('./binary').Binary
  , BinaryParser = require('./binary_parser').BinaryParser
  , writeIEEE754 = require('./float_parser').writeIEEE754
  , readIEEE754 = require('./float_parser').readIEEE754

// To ensure that 0.4 of node works correctly
var isDate = function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
}

/**
 * Create a new BSON instance
 *
 * @class Represents the BSON Parser
 * @return {BSON} instance of BSON Parser.
 */
function BSON () {};

/**
 * @ignore
 * @api private
 */
// BSON MAX VALUES
BSON.BSON_INT32_MAX = 0x7FFFFFFF;
BSON.BSON_INT32_MIN = -0x80000000;

BSON.BSON_INT64_MAX = Math.pow(2, 63) - 1;
BSON.BSON_INT64_MIN = -Math.pow(2, 63);

// JS MAX PRECISE VALUES
BSON.JS_INT_MAX = 0x20000000000000;  // Any integer up to 2^53 can be precisely represented by a double.
BSON.JS_INT_MIN = -0x20000000000000;  // Any integer down to -2^53 can be precisely represented by a double.

// Internal long versions
var JS_INT_MAX_LONG = Long.fromNumber(0x20000000000000);  // Any integer up to 2^53 can be precisely represented by a double.
var JS_INT_MIN_LONG = Long.fromNumber(-0x20000000000000);  // Any integer down to -2^53 can be precisely represented by a double.

/**
 * Number BSON Type
 *  
 * @classconstant BSON_DATA_NUMBER
 **/
BSON.BSON_DATA_NUMBER = 1;
/**
 * String BSON Type
 *  
 * @classconstant BSON_DATA_STRING
 **/
BSON.BSON_DATA_STRING = 2;
/**
 * Object BSON Type
 *  
 * @classconstant BSON_DATA_OBJECT
 **/
BSON.BSON_DATA_OBJECT = 3;
/**
 * Array BSON Type
 *  
 * @classconstant BSON_DATA_ARRAY
 **/
BSON.BSON_DATA_ARRAY = 4;
/**
 * Binary BSON Type
 *  
 * @classconstant BSON_DATA_BINARY
 **/
BSON.BSON_DATA_BINARY = 5;
/**
 * ObjectID BSON Type
 *  
 * @classconstant BSON_DATA_OID
 **/
BSON.BSON_DATA_OID = 7;
/**
 * Boolean BSON Type
 *  
 * @classconstant BSON_DATA_BOOLEAN
 **/
BSON.BSON_DATA_BOOLEAN = 8;
/**
 * Date BSON Type
 *  
 * @classconstant BSON_DATA_DATE
 **/
BSON.BSON_DATA_DATE = 9;
/**
 * null BSON Type
 *  
 * @classconstant BSON_DATA_NULL
 **/
BSON.BSON_DATA_NULL = 10;
/**
 * RegExp BSON Type
 *  
 * @classconstant BSON_DATA_REGEXP
 **/
BSON.BSON_DATA_REGEXP = 11;
/**
 * Code BSON Type
 *  
 * @classconstant BSON_DATA_CODE
 **/
BSON.BSON_DATA_CODE = 13;
/**
 * Symbol BSON Type
 *  
 * @classconstant BSON_DATA_SYMBOL
 **/
BSON.BSON_DATA_SYMBOL = 14;
/**
 * Code with Scope BSON Type
 *  
 * @classconstant BSON_DATA_CODE_W_SCOPE
 **/
BSON.BSON_DATA_CODE_W_SCOPE = 15;
/**
 * 32 bit Integer BSON Type
 *  
 * @classconstant BSON_DATA_INT
 **/
BSON.BSON_DATA_INT = 16;
/**
 * Timestamp BSON Type
 *  
 * @classconstant BSON_DATA_TIMESTAMP
 **/
BSON.BSON_DATA_TIMESTAMP = 17;
/**
 * Long BSON Type
 *  
 * @classconstant BSON_DATA_LONG
 **/
BSON.BSON_DATA_LONG = 18;
/**
 * MinKey BSON Type
 *  
 * @classconstant BSON_DATA_MIN_KEY
 **/
BSON.BSON_DATA_MIN_KEY = 0xff;
/**
 * MaxKey BSON Type
 *  
 * @classconstant BSON_DATA_MAX_KEY
 **/
BSON.BSON_DATA_MAX_KEY = 0x7f;

/**
 * Binary Default Type
 *  
 * @classconstant BSON_BINARY_SUBTYPE_DEFAULT
 **/
BSON.BSON_BINARY_SUBTYPE_DEFAULT = 0;
/**
 * Binary Function Type
 *  
 * @classconstant BSON_BINARY_SUBTYPE_FUNCTION
 **/
BSON.BSON_BINARY_SUBTYPE_FUNCTION = 1;
/**
 * Binary Byte Array Type
 *  
 * @classconstant BSON_BINARY_SUBTYPE_BYTE_ARRAY
 **/
BSON.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
/**
 * Binary UUID Type
 *  
 * @classconstant BSON_BINARY_SUBTYPE_UUID
 **/
BSON.BSON_BINARY_SUBTYPE_UUID = 3;
/**
 * Binary MD5 Type
 *  
 * @classconstant BSON_BINARY_SUBTYPE_MD5
 **/
BSON.BSON_BINARY_SUBTYPE_MD5 = 4;
/**
 * Binary User Defined Type
 *  
 * @classconstant BSON_BINARY_SUBTYPE_USER_DEFINED
 **/
BSON.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;

/**
 * Calculate the bson size for a passed in Javascript object.
 *
 * @param {Object} object the Javascript object to calculate the BSON byte size for.
 * @param {Boolean} [serializeFunctions] serialize all functions in the object **(default:false)**.
 * @return {Number} returns the number of bytes the BSON object will take up.
 * @api public
 */
BSON.calculateObjectSize = function calculateObjectSize(object, serializeFunctions) {
  var totalLength = (4 + 1);
    
  if(Array.isArray(object)) {
    for(var i = 0; i < object.length; i++) {
      totalLength += calculateElement(i.toString(), object[i], serializeFunctions)
    }
  } else {
		// If we have toBSON defined, override the current object
		if(object.toBSON) {
			object = object.toBSON();
		}
		
		// Calculate size
    for(var key in object) {
      totalLength += calculateElement(key, object[key], serializeFunctions)
    }
  } 

  return totalLength;
}

/**
 * @ignore
 * @api private
 */
function calculateElement(name, value, serializeFunctions) {
  var isBuffer = typeof Buffer !== 'undefined';
  
  switch(typeof value) {
    case 'string':       
      return 1 + (!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1 + 4 + (!isBuffer ? numberOfBytes(value) : Buffer.byteLength(value, 'utf8')) + 1;
    case 'number':
      if(Math.floor(value) === value && value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
        if(value >= BSON.BSON_INT32_MIN && value <= BSON.BSON_INT32_MAX) { // 32 bit
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (4 + 1);
        } else {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (8 + 1);
        }
      } else {  // 64 bit
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (8 + 1);
      }
    case 'undefined':
      return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (1);
    case 'boolean':
      return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (1 + 1);
    case 'object':   
      if(value == null || value instanceof MinKey || value instanceof MaxKey || value['_bsontype'] == 'MinKey' || value['_bsontype'] == 'MaxKey') {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (1);
      } else if(value instanceof ObjectID || value['_bsontype'] == 'ObjectID') {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (12 + 1);
      } else if(value instanceof Date || isDate(value)) {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (8 + 1);
      } else if(typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (1 + 4 + 1) + value.length;
      } else if(value instanceof Long || value instanceof Double || value instanceof Timestamp 
          || value['_bsontype'] == 'Long' || value['_bsontype'] == 'Double' || value['_bsontype'] == 'Timestamp') {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (8 + 1);        
      } else if(value instanceof Code || value['_bsontype'] == 'Code') {
        // Calculate size depending on the availability of a scope
        if(value.scope != null && Object.keys(value.scope).length > 0) {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + 4 + 4 + (!isBuffer ? numberOfBytes(value.code.toString()) : Buffer.byteLength(value.code.toString(), 'utf8')) + 1 + BSON.calculateObjectSize(value.scope, serializeFunctions);
        } else {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + 4 + (!isBuffer ? numberOfBytes(value.code.toString()) : Buffer.byteLength(value.code.toString(), 'utf8')) + 1;
        }                      
      } else if(value instanceof Binary || value['_bsontype'] == 'Binary') {
        // Check what kind of subtype we have
        if(value.sub_type == Binary.SUBTYPE_BYTE_ARRAY) {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (value.position + 1 + 4 + 1 + 4);
        } else {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + (value.position + 1 + 4 + 1);          
        }
      } else if(value instanceof Symbol || value['_bsontype'] == 'Symbol') {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + ((!isBuffer ? numberOfBytes(value.value) : Buffer.byteLength(value.value, 'utf8')) + 4 + 1 + 1);
      } else if(value instanceof DBRef || value['_bsontype'] == 'DBRef') {
        // Set up correct object for serialization
        var ordered_values = {
            '$ref': value.namespace
          , '$id' : value.oid
        };

        // Add db reference if it exists
        if(null != value.db) {
          ordered_values['$db'] = value.db;
        }
        
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + BSON.calculateObjectSize(ordered_values, serializeFunctions);
      } else if(value instanceof RegExp || Object.prototype.toString.call(value) === '[object RegExp]') {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + (!isBuffer ? numberOfBytes(value.source) : Buffer.byteLength(value.source, 'utf8')) + 1
            + (value.global ? 1 : 0) + (value.ignoreCase ? 1 : 0) + (value.multiline ? 1 : 0) + 1        
      } else {	
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + BSON.calculateObjectSize(value, serializeFunctions) + 1;        					
      }
    case 'function':
      // WTF for 0.4.X where typeof /someregexp/ === 'function'
      if(value instanceof RegExp || Object.prototype.toString.call(value) === '[object RegExp]' || String.call(value) == '[object RegExp]') {
        return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + (!isBuffer ? numberOfBytes(value.source) : Buffer.byteLength(value.source, 'utf8')) + 1
          + (value.global ? 1 : 0) + (value.ignoreCase ? 1 : 0) + (value.multiline ? 1 : 0) + 1
      } else {
        if(serializeFunctions && value.scope != null && Object.keys(value.scope).length > 0) {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + 4 + 4 + (!isBuffer ? numberOfBytes(value.toString()) : Buffer.byteLength(value.toString(), 'utf8')) + 1 + BSON.calculateObjectSize(value.scope, serializeFunctions);
        } else if(serializeFunctions) {
          return (name != null ? ((!isBuffer ? numberOfBytes(name) : Buffer.byteLength(name, 'utf8')) + 1) : 0) + 1 + 4 + (!isBuffer ? numberOfBytes(value.toString()) : Buffer.byteLength(value.toString(), 'utf8')) + 1;
        }      
      }
  }
  
  return 0;
}

/**
 * Serialize a Javascript object using a predefined Buffer and index into the buffer, useful when pre-allocating the space for serialization.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} checkKeys the serializer will check if keys are valid.
 * @param {Buffer} buffer the Buffer you pre-allocated to store the serialized BSON object.
 * @param {Number} index the index in the buffer where we wish to start serializing into.
 * @param {Boolean} serializeFunctions serialize the javascript functions **(default:false)**.
 * @return {Number} returns the new write index in the Buffer.
 * @api public
 */
BSON.serializeWithBufferAndIndex = function serializeWithBufferAndIndex(object, checkKeys, buffer, index, serializeFunctions) {
  // Default setting false
  serializeFunctions = serializeFunctions == null ? false : serializeFunctions;
  // Write end information (length of the object)
  var size = buffer.length;
  // Write the size of the object
  buffer[index++] = size & 0xff;          
  buffer[index++] = (size >> 8) & 0xff;
  buffer[index++] = (size >> 16) & 0xff;
  buffer[index++] = (size >> 24) & 0xff;     
  return serializeObject(object, checkKeys, buffer, index, serializeFunctions) - 1;
}

/**
 * @ignore
 * @api private
 */
var supportsBuffer = typeof Buffer != 'undefined';

var Writer = function(buffer){
    this.buffer = buffer;
    this.index = 0;
};

Writer.prototype.writeShort = function(val){
    this.buffer[this.index++] = val;
};

Writer.prototype.writeShortAt = function(val, position){
    this.buffer[position] = val;
};

if(supportsBuffer){
    Writer.prototype.writeInteger = function(val){
        this.buffer.writeInt32LE(val, this.index);
        this.index += 4;
    };

    Writer.prototype.writeIntegerAt = function(val, position){
        this.buffer.writeInt32LE(val, position);
    };
} else {
    Writer.prototype.writeInteger = function(val){
        this.buffer[this.index++] = val & 0xff;
        this.buffer[this.index++] = (val >> 8) & 0xff;
        this.buffer[this.index++] = (val >> 16) & 0xff;
        this.buffer[this.index++] = (val >> 24) & 0xff;
    };

    Writer.prototype.writeIntegerAt = function(val, position){
        this.buffer[position++] = val & 0xff;
        this.buffer[position++] = (val >> 8) & 0xff;
        this.buffer[position++] = (val >> 16) & 0xff;
        this.buffer[position] = (val >> 24) & 0xff;
    };
}

if(supportsBuffer){
    Writer.prototype.writeString = function(val){
        var bytesWritten = this.buffer.write(val, this.index, 'utf8');
        this.index += bytesWritten;
        this.writeNull();

        return bytesWritten + 1; //Include null in size calculation
    };

    Writer.prototype.writeStringAt = function(val, position){
        var bytesWritten = this.buffer.write(val, position, 'utf8');
        this.writeNullAt(position + bytesWritten);

        return bytesWritten + 1; //Include null in size calculation
    };
} else {
    Writer.prototype.writeString = function(val){
        var bytesWritten = writeToTypedArray(this.buffer, val, this.index);
        this.index += bytesWritten;
        this.writeNull();

        return bytesWritten + 1; //Include null in size calculation
    };

    Writer.prototype.writeStringAt = function(val, position){
        var bytesWritten = writeToTypedArray(this.buffer, val, position);
        this.writeNullAt(position + bytesWritten);

        return bytesWritten + 1; //Include null in size calculation
    };
}

Writer.prototype.writeLong = function(val){
    var lowBits = val.getLowBits();
    var highBits = val.getHighBits();

    //This method seems to be slower in the benchmark
    //this.writeInteger(lowBits);
    //this.writeInteger(highBits);

    // Encode low bits
    this.buffer[this.index++] = lowBits & 0xff;
    this.buffer[this.index++] = (lowBits >> 8) & 0xff;
    this.buffer[this.index++] = (lowBits >> 16) & 0xff;
    this.buffer[this.index++] = (lowBits >> 24) & 0xff;
    // Encode high bits
    this.buffer[this.index++] = highBits & 0xff;
    this.buffer[this.index++] = (highBits >> 8) & 0xff;
    this.buffer[this.index++] = (highBits >> 16) & 0xff;
    this.buffer[this.index++] = (highBits >> 24) & 0xff;
};

Writer.prototype.writeDouble = function(val){
    writeIEEE754(this.buffer, val, this.index, 'little', 52, 8);
    this.index += 8;
};

Writer.prototype.writeDate = function(val){
    //this.writeLong(Long.fromNumber(val.getTime())); //Strangely enough, just making this call slows down the benchmark by about 10%

    var dateInMilis = Long.fromNumber(val.getTime());
    var lowBits = dateInMilis.getLowBits();
    var highBits = dateInMilis.getHighBits();

    // Encode low bits
    this.buffer[this.index++] = lowBits & 0xff;
    this.buffer[this.index++] = (lowBits >> 8) & 0xff;
    this.buffer[this.index++] = (lowBits >> 16) & 0xff;
    this.buffer[this.index++] = (lowBits >> 24) & 0xff;
    // Encode high bits
    this.buffer[this.index++] = highBits & 0xff;
    this.buffer[this.index++] = (highBits >> 8) & 0xff;
    this.buffer[this.index++] = (highBits >> 16) & 0xff;
    this.buffer[this.index++] = (highBits >> 24) & 0xff;
};

if(supportsBuffer){
    Writer.prototype.writeObjectId = function(val){
        this.buffer.write(val.id, this.index, 'binary');
        this.index += 12;
    };
} else {
    Writer.prototype.writeObjectId = function(val){
        writeToTypedArray(this.buffer, val.id, this.index);
        this.index += 12;
    };
}


Writer.prototype.writeNull = function(){
    this.buffer[this.index++] = 0;
};

Writer.prototype.writeNullAt = function(position){
    this.buffer[position] = 0;
};

Writer.prototype.writeBufferWithSize = function(val){
    var size = val.length;

    this.writeInteger(size);

    // Write the default subtype
    this.writeShort(BSON.BSON_BINARY_SUBTYPE_DEFAULT);

    // Copy the content from the binary field to the buffer
    val.copy(this.buffer, this.index, 0, size);

    this.index += size;
};

Writer.prototype.skip = function(amount){
    this.index += amount;
};

Writer.prototype.getIndex = function(){
    return this.index;
};

Writer.prototype.setIndex = function(val){
    this.index = val;
};

Writer.prototype.getBuffer = function(){
    return this.buffer;
};

/**
 * @ignore
 * @api private
 */
var serializeObject = function(object, checkKeys, buffer, index, serializeFunctions) {
  if(buffer.writer == null){
    var writer = new Writer(buffer);
    buffer.writer = writer;
  }

  // Process the object
  if(Array.isArray(object)) {
    for(var i = 0; i < object.length; i++) {
      index = packElement(i.toString(), object[i], checkKeys, buffer, index, serializeFunctions);
    }
  } else {
		// If we have toBSON defined, override the current object
		if(object.toBSON) {
			object = object.toBSON();
		}
	
		// Serialize the object
    for(var key in object) {      
      // Check the key and throw error if it's illegal
      if(checkKeys ==  true && (key != '$db' && key != '$ref' && key != '$id')) {
        BSON.checkKey(key);        
      }

      // Pack the element
      index = packElement(key, object[key], checkKeys, buffer, index, serializeFunctions);
    }    
  }  
  
  // Write zero
  buffer[index++] = 0;
  return index;
}

var stringToBytes = function(str) {
  var ch, st, re = [];
  for (var i = 0; i < str.length; i++ ) {
    ch = str.charCodeAt(i);  // get char 
    st = [];                 // set up "stack"
    do {
      st.push( ch & 0xFF );  // push byte to stack
      ch = ch >> 8;          // shift value down by 1 byte
    }  
    while ( ch );
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re.concat( st.reverse() );
  }
  // return an array of bytes
  return re;
}

var numberOfBytes = function(str) {
  var ch, st, re = 0;
  for (var i = 0; i < str.length; i++ ) {
    ch = str.charCodeAt(i);  // get char 
    st = [];                 // set up "stack"
    do {
      st.push( ch & 0xFF );  // push byte to stack
      ch = ch >> 8;          // shift value down by 1 byte
    }  
    while ( ch );
    // add stack contents to result
    // done because chars have "wrong" endianness
    re = re + st.length;
  }
  // return an array of bytes
  return re;  
}

/**
 * @ignore
 * @api private
 */
var writeToTypedArray = function(buffer, string, index) {
  var bytes = stringToBytes(string);
  for(var i = 0; i < bytes.length; i++) {
    buffer[index + i] = bytes[i];
  }
  return bytes.length;
}

/**    throw 'a'
 * @ignore
 * @api private
 */
var packElement = function(name, value, checkKeys, buffer, index, serializeFunctions) {
  var startIndex = index;

    var writer = buffer.writer;
    writer.setIndex(index);

  switch(typeof value) {
    case 'string':
      // Encode String type

      writer.writeShort(BSON.BSON_DATA_STRING);
      writer.writeString(name);

      var sizeIndex = writer.getIndex();
      writer.skip(4);//Leave room for size

      var byteCount = writer.writeString(value);
      writer.writeIntegerAt(byteCount, sizeIndex);

      return writer.getIndex();
    case 'number':
      // We have an integer value
      if(Math.floor(value) === value && value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
        // If the value fits in 32 bits encode as int, if it fits in a double
        // encode it as a double, otherwise long
        if(value >= BSON.BSON_INT32_MIN && value <= BSON.BSON_INT32_MAX) {
          // Set int type 32 bits or less
          writer.writeShort(BSON.BSON_DATA_INT);
          writer.writeString(name);

          writer.writeInteger(value);
        } else if(value >= BSON.JS_INT_MIN && value <= BSON.JS_INT_MAX) {
          // Encode as double
          writer.writeShort(BSON.BSON_DATA_NUMBER);
          writer.writeString(name);

          writer.writeDouble(value);
        } else {
          // Set long type
          writer.writeShort(BSON.BSON_DATA_LONG);
          writer.writeString(name);

          writer.writeLong(Long.fromNumber(value));
        }
      } else {
          // Encode as double
          writer.writeShort(BSON.BSON_DATA_NUMBER);
          writer.writeString(name);

          writer.writeDouble(value);
      }
      
      return writer.getIndex();
    case 'undefined':
      writer.writeShort(BSON.BSON_DATA_NULL);
      writer.writeString(name);

      return writer.getIndex();
    case 'boolean':
      writer.writeShort(BSON.BSON_DATA_BOOLEAN);

      writer.writeString(name);
      writer.writeShort(value ? 1 : 0);

      return writer.getIndex();
    case 'object':   
      if(value === null || value instanceof MinKey || value instanceof MaxKey 
          || value['_bsontype'] == 'MinKey' || value['_bsontype'] == 'MaxKey') {

        // Write the type of either min or max key
        if(value === null) {
          writer.writeShort(BSON.BSON_DATA_NULL);
        } else if(value instanceof MinKey) {
          writer.writeShort(BSON.BSON_DATA_MIN_KEY);
        } else {
          writer.writeShort(BSON.BSON_DATA_MAX_KEY);
        }
      
        writer.writeString(name);

        return writer.getIndex();
      } else if(value instanceof ObjectID || value['_bsontype'] == 'ObjectID') {
        writer.writeShort(BSON.BSON_DATA_OID);
        writer.writeString(name);

        writer.writeObjectId(value);
        return writer.getIndex();
      } else if(value instanceof Date || isDate(value)) {
        writer.writeShort(BSON.BSON_DATA_DATE);
        writer.writeString(name);

        writer.writeDate(value);
        return writer.getIndex();
      } else if(typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
        writer.writeShort(BSON.BSON_DATA_BINARY);
        writer.writeString(name);

        writer.writeBufferWithSize(value);
        return writer.getIndex();
      } else if(value instanceof Long || value instanceof Timestamp || value['_bsontype'] == 'Long' || value['_bsontype'] == 'Timestamp') {
        writer.writeShort(value instanceof Long ? BSON.BSON_DATA_LONG : BSON.BSON_DATA_TIMESTAMP);
        writer.writeString(name);

        writer.writeLong(value);
        return writer.getIndex();
      } else if(value instanceof Double || value['_bsontype'] == 'Double') {
        writer.writeShort(BSON.BSON_DATA_NUMBER);
        writer.writeString(name);

        writer.writeDouble(value);
        return writer.getIndex();
      } else if(value instanceof Code || value['_bsontype'] == 'Code') {
        if(value.scope != null && Object.keys(value.scope).length > 0) {
          // Write the type
          buffer[index++] = BSON.BSON_DATA_CODE_W_SCOPE;
          // Number of written bytes
          var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
          // Encode the name
          index = index + numberOfWrittenBytes + 1;
          buffer[index - 1] = 0;
          // Calculate the scope size
          var scopeSize = BSON.calculateObjectSize(value.scope, serializeFunctions);
          // Function string
          var functionString = value.code.toString();
          // Function Size
          var codeSize = supportsBuffer ? Buffer.byteLength(functionString) + 1 : numberOfBytes(functionString) + 1;

          // Calculate full size of the object
          var totalSize = 4 + codeSize + scopeSize + 4;

          // Write the total size of the object
          buffer[index++] = totalSize & 0xff;
          buffer[index++] = (totalSize >> 8) & 0xff;
          buffer[index++] = (totalSize >> 16) & 0xff;
          buffer[index++] = (totalSize >> 24) & 0xff;     

          // Write the size of the string to buffer
          buffer[index++] = codeSize & 0xff;
          buffer[index++] = (codeSize >> 8) & 0xff;
          buffer[index++] = (codeSize >> 16) & 0xff;
          buffer[index++] = (codeSize >> 24) & 0xff;     

          // Write the string
          supportsBuffer ? buffer.write(functionString, index, 'utf8') : writeToTypedArray(buffer, functionString, index);
          // Update index
          index = index + codeSize - 1;
          // Write zero
          buffer[index++] = 0;
          // Serialize the scope object          
          var scopeObjectBuffer = supportsBuffer ? new Buffer(scopeSize) : new Uint8Array(new ArrayBuffer(scopeSize));
          // Execute the serialization into a seperate buffer
          serializeObject(value.scope, checkKeys, scopeObjectBuffer, 0, serializeFunctions);
          
          // Adjusted scope Size (removing the header)
          var scopeDocSize = scopeSize;
          // Write scope object size
          buffer[index++] = scopeDocSize & 0xff;
          buffer[index++] = (scopeDocSize >> 8) & 0xff;
          buffer[index++] = (scopeDocSize >> 16) & 0xff;
          buffer[index++] = (scopeDocSize >> 24) & 0xff;     
          
          // Write the scopeObject into the buffer
          supportsBuffer ? scopeObjectBuffer.copy(buffer, index, 0, scopeSize) : buffer.set(scopeObjectBuffer, index);
          // Adjust index, removing the empty size of the doc (5 bytes 0000000005)
          index = index + scopeDocSize - 5;          
          // Write trailing zero
          buffer[index++] = 0;
          return index
        } else {
          buffer[index++] = BSON.BSON_DATA_CODE;
          // Number of written bytes
          var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
          // Encode the name
          index = index + numberOfWrittenBytes + 1;
          buffer[index - 1] = 0;
          // Function string
          var functionString = value.code.toString();
          // Function Size
          var size = supportsBuffer ? Buffer.byteLength(functionString) + 1 : numberOfBytes(functionString) + 1;
          // Write the size of the string to buffer
          buffer[index++] = size & 0xff;
          buffer[index++] = (size >> 8) & 0xff;
          buffer[index++] = (size >> 16) & 0xff;
          buffer[index++] = (size >> 24) & 0xff;     
          // Write the string
          buffer.write(functionString, index, 'utf8');
          // Update index
          index = index + size - 1;
          // Write zero
          buffer[index++] = 0;          
          return index;
        }                              
      } else if(value instanceof Binary || value['_bsontype'] == 'Binary') {
        // Write the type
        buffer[index++] = BSON.BSON_DATA_BINARY;
        // Number of written bytes
        var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
        // Encode the name
        index = index + numberOfWrittenBytes + 1;
        buffer[index - 1] = 0;
        // Extract the buffer
        var data = value.value(true);        
        // Calculate size
        var size = value.position;
        // Write the size of the string to buffer
        buffer[index++] = size & 0xff;
        buffer[index++] = (size >> 8) & 0xff;
        buffer[index++] = (size >> 16) & 0xff;
        buffer[index++] = (size >> 24) & 0xff;     
        // Write the subtype to the buffer
        buffer[index++] = value.sub_type;

        // If we have binary type 2 the 4 first bytes are the size
        if(value.sub_type == Binary.SUBTYPE_BYTE_ARRAY) {
          buffer[index++] = size & 0xff;
          buffer[index++] = (size >> 8) & 0xff;
          buffer[index++] = (size >> 16) & 0xff;
          buffer[index++] = (size >> 24) & 0xff;     
        }

        // Write the data to the object
        supportsBuffer ? data.copy(buffer, index, 0, value.position) : buffer.set(data, index);
        // Ajust index
        index = index + value.position;
        return index;
      } else if(value instanceof Symbol || value['_bsontype'] == 'Symbol') {
        // Write the type
        buffer[index++] = BSON.BSON_DATA_SYMBOL;
        // Number of written bytes
        var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
        // Encode the name
        index = index + numberOfWrittenBytes + 1;
        buffer[index - 1] = 0;
        // Calculate size
        var size = supportsBuffer ? Buffer.byteLength(value.value) + 1 : numberOfBytes(value.value) + 1;
        // Write the size of the string to buffer
        buffer[index++] = size & 0xff;
        buffer[index++] = (size >> 8) & 0xff;
        buffer[index++] = (size >> 16) & 0xff;
        buffer[index++] = (size >> 24) & 0xff;     
        // Write the string
        buffer.write(value.value, index, 'utf8');
        // Update index
        index = index + size - 1;
        // Write zero
        buffer[index++] = 0x00;
        return index;        
      } else if(value instanceof DBRef || value['_bsontype'] == 'DBRef') {
        // Write the type
        buffer[index++] = BSON.BSON_DATA_OBJECT;
        // Number of written bytes
        var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
        // Encode the name
        index = index + numberOfWrittenBytes + 1;
        buffer[index - 1] = 0;
        // Set up correct object for serialization
        var ordered_values = {
            '$ref': value.namespace
          , '$id' : value.oid
        };
    
        // Add db reference if it exists
        if(null != value.db) {
          ordered_values['$db'] = value.db;
        }

        // Message size
        var size = BSON.calculateObjectSize(ordered_values, serializeFunctions);
        // Serialize the object
        var endIndex = BSON.serializeWithBufferAndIndex(ordered_values, checkKeys, buffer, index, serializeFunctions);
        // Write the size of the string to buffer
        buffer[index++] = size & 0xff;
        buffer[index++] = (size >> 8) & 0xff;
        buffer[index++] = (size >> 16) & 0xff;
        buffer[index++] = (size >> 24) & 0xff;     
        // Write zero for object
        buffer[endIndex++] = 0x00;
        // Return the end index
        return endIndex;
      } else if(value instanceof RegExp || Object.prototype.toString.call(value) === '[object RegExp]') {
        // Write the type
        buffer[index++] = BSON.BSON_DATA_REGEXP;
        // Number of written bytes
        var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
        // Encode the name
        index = index + numberOfWrittenBytes + 1;
        buffer[index - 1] = 0;

        // Write the regular expression string
        supportsBuffer ? buffer.write(value.source, index, 'utf8') : writeToTypedArray(buffer, value.source, index);
        // Adjust the index
        index = index + (supportsBuffer ? Buffer.byteLength(value.source) : numberOfBytes(value.source));
        // Write zero
        buffer[index++] = 0x00;        
        // Write the parameters
        if(value.global) buffer[index++] = 0x73; // s
        if(value.ignoreCase) buffer[index++] = 0x69; // i
        if(value.multiline) buffer[index++] = 0x6d; // m
        // Add ending zero
        buffer[index++] = 0x00;
        return index;
      } else {
        // Write the type
        buffer[index++] = Array.isArray(value) ? BSON.BSON_DATA_ARRAY : BSON.BSON_DATA_OBJECT;        
        // Number of written bytes
        var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
        // Adjust the index
        index = index + numberOfWrittenBytes + 1;
        buffer[index - 1] = 0;
	      var endIndex = serializeObject(value, checkKeys, buffer, index + 4, serializeFunctions);
        // Write size
        var size = endIndex - index;
        // Write the size of the string to buffer
        buffer[index++] = size & 0xff;
        buffer[index++] = (size >> 8) & 0xff;
        buffer[index++] = (size >> 16) & 0xff;
        buffer[index++] = (size >> 24) & 0xff;     
        return endIndex;
      }
    case 'function':
      // WTF for 0.4.X where typeof /someregexp/ === 'function'
      if(value instanceof RegExp || Object.prototype.toString.call(value) === '[object RegExp]' || String.call(value) == '[object RegExp]') {        
        // Write the type
        buffer[index++] = BSON.BSON_DATA_REGEXP;
        // Number of written bytes
        var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
        // Encode the name
        index = index + numberOfWrittenBytes + 1;
        buffer[index - 1] = 0;

        // Write the regular expression string
        buffer.write(value.source, index, 'utf8');
        // Adjust the index
        index = index + (supportsBuffer ? Buffer.byteLength(value.source) : numberOfBytes(value.source));
        // Write zero
        buffer[index++] = 0x00;        
        // Write the parameters
        if(value.global) buffer[index++] = 0x73; // s
        if(value.ignoreCase) buffer[index++] = 0x69; // i
        if(value.multiline) buffer[index++] = 0x6d; // m
        // Add ending zero
        buffer[index++] = 0x00;
        return index;
      } else {
        if(serializeFunctions && value.scope != null && Object.keys(value.scope).length > 0) {
          // Write the type
          buffer[index++] = BSON.BSON_DATA_CODE_W_SCOPE;
          // Number of written bytes
          var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
          // Encode the name
          index = index + numberOfWrittenBytes + 1;
          buffer[index - 1] = 0;
          // Calculate the scope size
          var scopeSize = BSON.calculateObjectSize(value.scope, serializeFunctions);
          // Function string
          var functionString = value.toString();
          // Function Size
          var codeSize = supportsBuffer ? Buffer.byteLength(functionString) + 1 : numberOfBytes(functionString) + 1;

          // Calculate full size of the object
          var totalSize = 4 + codeSize + scopeSize;

          // Write the total size of the object
          buffer[index++] = totalSize & 0xff;
          buffer[index++] = (totalSize >> 8) & 0xff;
          buffer[index++] = (totalSize >> 16) & 0xff;
          buffer[index++] = (totalSize >> 24) & 0xff;     

          // Write the size of the string to buffer
          buffer[index++] = codeSize & 0xff;
          buffer[index++] = (codeSize >> 8) & 0xff;
          buffer[index++] = (codeSize >> 16) & 0xff;
          buffer[index++] = (codeSize >> 24) & 0xff;     

          // Write the string
          buffer.write(functionString, index, 'utf8');
          // Update index
          index = index + codeSize - 1;
          // Write zero
          buffer[index++] = 0;
          // Serialize the scope object          
          var scopeObjectBuffer = new Buffer(scopeSize);
          // Execute the serialization into a seperate buffer
          serializeObject(value.scope, checkKeys, scopeObjectBuffer, 0, serializeFunctions);

          // Adjusted scope Size (removing the header)
          var scopeDocSize = scopeSize - 4;
          // Write scope object size
          buffer[index++] = scopeDocSize & 0xff;
          buffer[index++] = (scopeDocSize >> 8) & 0xff;
          buffer[index++] = (scopeDocSize >> 16) & 0xff;
          buffer[index++] = (scopeDocSize >> 24) & 0xff;     

          // Write the scopeObject into the buffer
          scopeObjectBuffer.copy(buffer, index, 0, scopeSize);

          // Adjust index, removing the empty size of the doc (5 bytes 0000000005)
          index = index + scopeDocSize - 5;          
          // Write trailing zero
          buffer[index++] = 0;
          return index
        } else if(serializeFunctions) {
          buffer[index++] = BSON.BSON_DATA_CODE;
          // Number of written bytes
          var numberOfWrittenBytes = supportsBuffer ? buffer.write(name, index, 'utf8') : writeToTypedArray(buffer, name, index);
          // Encode the name
          index = index + numberOfWrittenBytes + 1;
          buffer[index - 1] = 0;
          // Function string
          var functionString = value.toString();
          // Function Size
          var size = supportsBuffer ? Buffer.byteLength(functionString) + 1 : numberOfBytes(functionString) + 1;
          // Write the size of the string to buffer
          buffer[index++] = size & 0xff;
          buffer[index++] = (size >> 8) & 0xff;
          buffer[index++] = (size >> 16) & 0xff;
          buffer[index++] = (size >> 24) & 0xff;     
          // Write the string
          buffer.write(functionString, index, 'utf8');
          // Update index
          index = index + size - 1;
          // Write zero
          buffer[index++] = 0;          
          return index;
        }        
      }
  }
  
  // If no value to serialize
  return index;  
}

/**
 * Serialize a Javascript object.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} checkKeys the serializer will check if keys are valid.
 * @param {Boolean} asBuffer return the serialized object as a Buffer object **(ignore)**.
 * @param {Boolean} serializeFunctions serialize the javascript functions **(default:false)**.
 * @return {Buffer} returns the Buffer object containing the serialized object.
 * @api public
 */
BSON.serialize = function(object, checkKeys, asBuffer, serializeFunctions) {
  var buffer = null;
  // Calculate the size of the object
  var size = BSON.calculateObjectSize(object, serializeFunctions);
  // Fetch the best available type for storing the binary data
  if(buffer = typeof Buffer != 'undefined') {
    buffer = new Buffer(size);
    asBuffer = true;
  } else if(typeof Uint8Array != 'undefined') {
    buffer = new Uint8Array(new ArrayBuffer(size));
  } else {
    buffer = new Array(size);
  }
  
  // If asBuffer is false use typed arrays
  BSON.serializeWithBufferAndIndex(object, checkKeys, buffer, 0, serializeFunctions);
  return buffer;
}

/**
 * Contains the function cache if we have that enable to allow for avoiding the eval step on each deserialization, comparison is by md5
 *
 * @ignore
 * @api private
 */
var functionCache = BSON.functionCache = {};

/**
 * Crc state variables shared by function
 *
 * @ignore
 * @api private
 */
var table = [0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3, 0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988, 0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91, 0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE, 0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7, 0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC, 0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5, 0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172, 0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B, 0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940, 0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59, 0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116, 0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F, 0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924, 0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D, 0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A, 0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433, 0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818, 0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01, 0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E, 0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457, 0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C, 0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65, 0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2, 0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB, 0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0, 0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9, 0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086, 0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F, 0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4, 0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD, 0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A, 0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683, 0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8, 0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1, 0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE, 0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7, 0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC, 0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5, 0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252, 0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B, 0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60, 0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79, 0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236, 0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F, 0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04, 0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D, 0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A, 0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713, 0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38, 0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21, 0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E, 0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777, 0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C, 0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45, 0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2, 0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB, 0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0, 0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9, 0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6, 0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF, 0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94, 0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D];

/**
 * CRC32 hash method, Fast and enough versitility for our usage
 *
 * @ignore
 * @api private
 */
var crc32 =  function(string, start, end) {
  var crc = 0
  var x = 0;
  var y = 0;
  crc = crc ^ (-1);

  for(var i = start, iTop = end; i < iTop;i++) {
  	y = (crc ^ string[i]) & 0xFF;
    x = table[y];
  	crc = (crc >>> 8) ^ x;
  }
  
  return crc ^ (-1);
}

/**
 * Deserialize stream data as BSON documents.
 *
 * Options
 *  - **evalFunctions** {Boolean, default:false}, evaluate functions in the BSON document scoped to the object deserialized.
 *  - **cacheFunctions** {Boolean, default:false}, cache evaluated functions for reuse.
 *  - **cacheFunctionsCrc32** {Boolean, default:false}, use a crc32 code for caching, otherwise use the string of the function.
 *
 * @param {Buffer} data the buffer containing the serialized set of BSON documents.
 * @param {Number} startIndex the start index in the data Buffer where the deserialization is to start.
 * @param {Number} numberOfDocuments number of documents to deserialize.
 * @param {Array} documents an array where to store the deserialized documents.
 * @param {Number} docStartIndex the index in the documents array from where to start inserting documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @return {Number} returns the next index in the buffer after deserialization **x** numbers of documents.
 * @api public
 */
BSON.deserializeStream = function(data, startIndex, numberOfDocuments, documents, docStartIndex, options) {  
  // if(numberOfDocuments !== documents.length) throw new Error("Number of expected results back is less than the number of documents");
  options = options != null ? options : {};
  var index = startIndex;
  // Loop over all documents
  for(var i = 0; i < numberOfDocuments; i++) {
    // Find size of the document
    var size = data[index] | data[index + 1] << 8 | data[index + 2] << 16 | data[index + 3] << 24;
    // Update options with index
    options['index'] = index; 
    // Parse the document at this point
    documents[docStartIndex + i] = BSON.deserialize(data, options);
    // Adjust index by the document size
    index = index + size;
  }
  
  // Return object containing end index of parsing and list of documents
  return index;
}

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
var isolateEvalWithHash = function(functionCache, hash, functionString, object) {
  // Contains the value we are going to set
  var value = null;            

  // Check for cache hit, eval if missing and return cached function
  if(functionCache[hash] == null) {            
    eval("value = " + functionString);          
    functionCache[hash] = value;
  }
  // Set the object
  return functionCache[hash].bind(object);                    
}

/**
 * Ensure eval is isolated.
 *
 * @ignore
 * @api private
 */
var isolateEval = function(functionString) {
  // Contains the value we are going to set
  var value = null;            
  // Eval the function
  eval("value = " + functionString); 
  return value; 
}

/**
 * Convert Uint8Array to String
 *
 * @ignore
 * @api private
 */
var convertUint8ArrayToUtf8String = function(byteArray, startIndex, endIndex) {
  return BinaryParser.decode_utf8(convertArraytoUtf8BinaryString(byteArray, startIndex, endIndex));
}

var convertArraytoUtf8BinaryString = function(byteArray, startIndex, endIndex) {
  var result = "";
  for(var i = startIndex; i < endIndex; i++) {
    result = result + String.fromCharCode(byteArray[i]);
  }
  
  return result;  
};

/**
 * Deserialize data as BSON.
 *
 * Options
 *  - **evalFunctions** {Boolean, default:false}, evaluate functions in the BSON document scoped to the object deserialized.
 *  - **cacheFunctions** {Boolean, default:false}, cache evaluated functions for reuse.
 *  - **cacheFunctionsCrc32** {Boolean, default:false}, use a crc32 code for caching, otherwise use the string of the function.
 *
 * @param {Buffer} buffer the buffer containing the serialized set of BSON documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @param {Boolean} [isArray] ignore used for recursive parsing.
 * @return {Object} returns the deserialized Javascript Object.
 * @api public
 */
BSON.deserialize = function(buffer, options, isArray) {  
  // Options
  options = options == null ? {} : options;
  var evalFunctions = options['evalFunctions'] == null ? false : options['evalFunctions'];
  var cacheFunctions = options['cacheFunctions'] == null ? false : options['cacheFunctions'];
  var cacheFunctionsCrc32 = options['cacheFunctionsCrc32'] == null ? false : options['cacheFunctionsCrc32'];  
  
  // Validate that we have at least 4 bytes of buffer
  if(buffer.length < 5) throw new Error("corrupt bson message < 5 bytes long");
  
  // Set up index
  var index = typeof options['index'] == 'number' ? options['index'] : 0;
  // Reads in a C style string
  var readCStyleString = function() {
    // Get the start search index
    var i = index;
    // Locate the end of the c string
    while(buffer[i] !== 0x00) { i++ }
    // Grab utf8 encoded string
    var string = supportsBuffer && Buffer.isBuffer(buffer) ? buffer.toString('utf8', index, i) : convertUint8ArrayToUtf8String(buffer, index, i);
    // Update index position
    index = i + 1;
    // Return string
    return string;
  }

  // Create holding object
  var object = isArray ? [] : {};

  // Read the document size
  var size = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
  
  // Ensure buffer is valid size
  if(size < 5 || size > buffer.length) throw new Error("corrupt bson message");

  // While we have more left data left keep parsing
  while(true) {
    // Read the type
    var elementType = buffer[index++];
    // If we get a zero it's the last byte, exit
    if(elementType == 0) break;
    // Read the name of the field
    var name = readCStyleString();
    // Switch on the type
    switch(elementType) {
      case BSON.BSON_DATA_OID:
        var string = supportsBuffer && Buffer.isBuffer(buffer) ? buffer.toString('binary', index, index + 12) : convertArraytoUtf8BinaryString(buffer, index, index + 12);
        // Decode the oid
        object[name] = new ObjectID(string);
        // Update index
        index = index + 12;
        break;          
      case BSON.BSON_DATA_STRING:
        // Read the content of the field
        var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Add string to object
        object[name] = supportsBuffer && Buffer.isBuffer(buffer) ? buffer.toString('utf8', index, index + stringSize - 1) : convertUint8ArrayToUtf8String(buffer, index, index + stringSize - 1);
        // Update parse index position
        index = index + stringSize;
        break;
      case BSON.BSON_DATA_INT:
        // Decode the 32bit value
        object[name] = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        break;
      case BSON.BSON_DATA_NUMBER:
        // Decode the double value
        object[name] = readIEEE754(buffer, index, 'little', 52, 8);
        // Update the index
        index = index + 8;
        break;
      case BSON.BSON_DATA_DATE:
        // Unpack the low and high bits
        var lowBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        var highBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Set date object
        object[name] = new Date(new Long(lowBits, highBits).toNumber());
        break;
      case BSON.BSON_DATA_BOOLEAN:
        // Parse the boolean value
        object[name] = buffer[index++] == 1;
        break;
      case BSON.BSON_DATA_NULL:
        // Parse the boolean value
        object[name] = null;
        break;
      case BSON.BSON_DATA_BINARY:
        // Decode the size of the binary blob
        var binarySize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Decode the subtype
        var subType = buffer[index++];
        // Decode as raw Buffer object if options specifies it
        if(buffer['slice'] != null) {
          // If we have subtype 2 skip the 4 bytes for the size
          if(subType == Binary.SUBTYPE_BYTE_ARRAY) {
            binarySize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
          }
          // Slice the data
          object[name] = new Binary(buffer.slice(index, index + binarySize), subType);          
        } else {
          var _buffer = typeof Uint8Array != 'undefined' ? new Uint8Array(new ArrayBuffer(binarySize)) : new Array(binarySize);
          // If we have subtype 2 skip the 4 bytes for the size
          if(subType == Binary.SUBTYPE_BYTE_ARRAY) {
            binarySize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
          }
          // Copy the data
          for(var i = 0; i < binarySize; i++) {
            _buffer[i] = buffer[index + i];
          }
          // Create the binary object
          object[name] = new Binary(_buffer, subType);
        }
        // Update the index
        index = index + binarySize;
        break;
      case BSON.BSON_DATA_ARRAY:
        options['index'] = index;
        // Decode the size of the array document
        var objectSize = buffer[index] | buffer[index + 1] << 8 | buffer[index + 2] << 16 | buffer[index + 3] << 24;
        // Set the array to the object
        object[name] = BSON.deserialize(buffer, options, true);
        // Adjust the index
        index = index + objectSize;
        break;
      case BSON.BSON_DATA_OBJECT:
        options['index'] = index;
        // Decode the size of the object document
        var objectSize = buffer[index] | buffer[index + 1] << 8 | buffer[index + 2] << 16 | buffer[index + 3] << 24;
        // Set the array to the object
        object[name] = BSON.deserialize(buffer, options, false);
        // Adjust the index
        index = index + objectSize;
        break;
      case BSON.BSON_DATA_REGEXP:
        // Create the regexp
        var source = readCStyleString();
        var regExpOptions = readCStyleString();
        // For each option add the corresponding one for javascript
        var optionsArray = new Array(regExpOptions.length);
            
        // Parse options
        for(var i = 0; i < regExpOptions.length; i++) {
          switch(regExpOptions[i]) {
            case 'm':
              optionsArray[i] = 'm';
              break;
            case 's':
              optionsArray[i] = 'g';
              break;
            case 'i':
              optionsArray[i] = 'i';
              break;                
          }
        }
        
        object[name] = new RegExp(source, optionsArray.join(''));
        break;        
      case BSON.BSON_DATA_LONG:
        // Unpack the low and high bits
        var lowBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        var highBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Create long object
        var long = new Long(lowBits, highBits);
        // Set the object
        object[name] = long.lessThanOrEqual(JS_INT_MAX_LONG) && long.greaterThanOrEqual(JS_INT_MIN_LONG) ? long.toNumber() : long;
        break;
      case BSON.BSON_DATA_SYMBOL:
        // Read the content of the field
        var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Add string to object
        object[name] = new Symbol(buffer.toString('utf8', index, index + stringSize - 1));
        // Update parse index position
        index = index + stringSize;
        break;
      case BSON.BSON_DATA_TIMESTAMP:
        // Unpack the low and high bits
        var lowBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        var highBits = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Set the object
        object[name] = new Timestamp(lowBits, highBits);
        break;
      case BSON.BSON_DATA_MIN_KEY:
        // Parse the object
        object[name] = new MinKey();
        break;
      case BSON.BSON_DATA_MAX_KEY:
        // Parse the object
        object[name] = new MaxKey();
        break;
      case BSON.BSON_DATA_CODE:
        // Read the content of the field
        var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Function string
        var functionString = supportsBuffer && Buffer.isBuffer(buffer) ? buffer.toString('utf8', index, index + stringSize - 1) : convertUint8ArrayToUtf8String(buffer, index, index + stringSize - 1);

        // If we are evaluating the functions
        if(evalFunctions) {
          // Contains the value we are going to set
          var value = null;            
          // If we have cache enabled let's look for the md5 of the function in the cache        
          if(cacheFunctions) {
            var hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
            // Got to do this to avoid V8 deoptimizing the call due to finding eval
            object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
          } else {
            // Set directly
            object[name] = isolateEval(functionString);
          }
        } else {
          object[name]  = new Code(functionString, {});
        }

        // Update parse index position
        index = index + stringSize;
        break;
      case BSON.BSON_DATA_CODE_W_SCOPE:
        // Read the content of the field
        var totalSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        var stringSize = buffer[index++] | buffer[index++] << 8 | buffer[index++] << 16 | buffer[index++] << 24;
        // Javascript function
        var functionString = supportsBuffer && Buffer.isBuffer(buffer) ? buffer.toString('utf8', index, index + stringSize - 1) : convertUint8ArrayToUtf8String(buffer, index, index + stringSize - 1);
        // Update parse index position
        index = index + stringSize;
        // Parse the element
        options['index'] = index;
        // Decode the size of the object document
        var objectSize = buffer[index] | buffer[index + 1] << 8 | buffer[index + 2] << 16 | buffer[index + 3] << 24;
        // Decode the scope object
        var scopeObject = BSON.deserialize(buffer, options, false);
        // Adjust the index
        index = index + objectSize;
            
        // If we are evaluating the functions
        if(evalFunctions) {
          // Contains the value we are going to set
          var value = null;            
          // If we have cache enabled let's look for the md5 of the function in the cache        
          if(cacheFunctions) {
            var hash = cacheFunctionsCrc32 ? crc32(functionString) : functionString;
            // Got to do this to avoid V8 deoptimizing the call due to finding eval
            object[name] = isolateEvalWithHash(functionCache, hash, functionString, object);
          } else {
            // Set directly
            object[name] = isolateEval(functionString);
          }
            
          // Set the scope on the object
          object[name].scope = scopeObject;
        } else {
          object[name]  = new Code(functionString, scopeObject);
        }
            
        // Add string to object
        break;
    }
  }
  
  // Check if we have a db ref object
  if(object['$id'] != null) object = new DBRef(object['$ref'], object['$id'], object['$db']);

  // Return the final objects
  return object;
}
 
/**
 * Check if key name is valid.
 *
 * @ignore
 * @api private
 */
BSON.checkKey = function checkKey (key) {
  if (!key.length) return;
  // Check if we have a legal key for the object
  if('$' == key[0]) {
    throw Error("key " + key + " must not start with '$'");
  } else if (!!~key.indexOf('.')) {
    throw Error("key " + key + " must not contain '.'");
  }
};

/**
 * Deserialize data as BSON.
 *
 * Options
 *  - **evalFunctions** {Boolean, default:false}, evaluate functions in the BSON document scoped to the object deserialized.
 *  - **cacheFunctions** {Boolean, default:false}, cache evaluated functions for reuse.
 *  - **cacheFunctionsCrc32** {Boolean, default:false}, use a crc32 code for caching, otherwise use the string of the function.
 *
 * @param {Buffer} buffer the buffer containing the serialized set of BSON documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @param {Boolean} [isArray] ignore used for recursive parsing.
 * @return {Object} returns the deserialized Javascript Object.
 * @api public
 */
BSON.prototype.deserialize = function(data, options) {
  return BSON.deserialize(data, options);
}

/**
 * Deserialize stream data as BSON documents.
 *
 * Options
 *  - **evalFunctions** {Boolean, default:false}, evaluate functions in the BSON document scoped to the object deserialized.
 *  - **cacheFunctions** {Boolean, default:false}, cache evaluated functions for reuse.
 *  - **cacheFunctionsCrc32** {Boolean, default:false}, use a crc32 code for caching, otherwise use the string of the function.
 *
 * @param {Buffer} data the buffer containing the serialized set of BSON documents.
 * @param {Number} startIndex the start index in the data Buffer where the deserialization is to start.
 * @param {Number} numberOfDocuments number of documents to deserialize.
 * @param {Array} documents an array where to store the deserialized documents.
 * @param {Number} docStartIndex the index in the documents array from where to start inserting documents.
 * @param {Object} [options] additional options used for the deserialization.
 * @return {Number} returns the next index in the buffer after deserialization **x** numbers of documents.
 * @api public
 */
BSON.prototype.deserializeStream = function(data, startIndex, numberOfDocuments, documents, docStartIndex, options) {
  return BSON.deserializeStream(data, startIndex, numberOfDocuments, documents, docStartIndex, options);
}

/**
 * Serialize a Javascript object.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} checkKeys the serializer will check if keys are valid.
 * @param {Boolean} asBuffer return the serialized object as a Buffer object **(ignore)**.
 * @param {Boolean} serializeFunctions serialize the javascript functions **(default:false)**.
 * @return {Buffer} returns the Buffer object containing the serialized object.
 * @api public
 */
BSON.prototype.serialize = function(object, checkKeys, asBuffer, serializeFunctions) {
  return BSON.serialize(object, checkKeys, asBuffer, serializeFunctions);
}

/**
 * Calculate the bson size for a passed in Javascript object.
 *
 * @param {Object} object the Javascript object to calculate the BSON byte size for.
 * @param {Boolean} [serializeFunctions] serialize all functions in the object **(default:false)**.
 * @return {Number} returns the number of bytes the BSON object will take up.
 * @api public
 */
BSON.prototype.calculateObjectSize = function(object, serializeFunctions) {  
  return BSON.calculateObjectSize(object, serializeFunctions);
}

/**
 * Serialize a Javascript object using a predefined Buffer and index into the buffer, useful when pre-allocating the space for serialization.
 *
 * @param {Object} object the Javascript object to serialize.
 * @param {Boolean} checkKeys the serializer will check if keys are valid.
 * @param {Buffer} buffer the Buffer you pre-allocated to store the serialized BSON object.
 * @param {Number} index the index in the buffer where we wish to start serializing into.
 * @param {Boolean} serializeFunctions serialize the javascript functions **(default:false)**.
 * @return {Number} returns the new write index in the Buffer.
 * @api public
 */
BSON.prototype.serializeWithBufferAndIndex = function(object, checkKeys, buffer, startIndex, serializeFunctions) {
  return BSON.serializeWithBufferAndIndex(object, checkKeys, buffer, startIndex, serializeFunctions);
}

/**
 * @ignore
 * @api private
 */
exports.Code = Code;
exports.Symbol = Symbol;
exports.BSON = BSON;
exports.DBRef = DBRef;
exports.Binary = Binary;
exports.ObjectID = ObjectID;
exports.Long = Long;
exports.Timestamp = Timestamp;
exports.Double = Double;
exports.MinKey = MinKey;
exports.MaxKey = MaxKey;