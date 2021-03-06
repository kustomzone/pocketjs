/**
 * Pocket.js v2.0.0
 *
 * @file A blazing fast lightweight storage library
 * @author Vincent Racine vincentracine@hotmail.co.uk
 * @license MIT
 */
function Pocket(options){

	'use strict';

	var Utils = {
		/**
		 * Checks a value if of type array
		 * @param {*} arg
		 * @returns {boolean}
		 */
		isArray: function(arg){
			return Object.prototype.toString.call(arg) === '[object Array]';
		},

		/**
		 * Checks a value if of type object
		 * @param {*} arg
		 * @returns {boolean}
		 */
		isObject: function(arg){
			return Object.prototype.toString.call(arg) === '[object Object]';
		},

		/**
		 * Recursively merge two objects
		 * @param obj1
		 * @param obj2
		 * @returns {*}
		 */
		merge: function(obj1, obj2){
			for (var p in obj2) {
				try {
					if(obj2[p].constructor == Object) {
						obj1[p] = Utils.merge(obj1[p], obj2[p]);
					}else{
						obj1[p] = obj2[p];
					}
				}catch(e) {
					obj1[p] = obj2[p];
				}
			}
			return obj1;
		},

		/**
		 * Clone object
		 */
		clone: function(arg){
			return (JSON.parse(JSON.stringify(arg)));
		},

		/**
		 * Generates an id with a extremely low chance of collision
		 * @returns {string} ID
		 */
		uuid: function(){
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
		}
	};
	var Query = {
		/**
		 * Formats a DB query
		 * @param {object|string|number} [query] DB query to format
		 */
		format: function(query){
			if(!query) return {};
			if(typeof query === 'string' || typeof arg === 'number') return {_id:query};
			return query;
		},

		/**
		 * Finds documents which are valid based on a query
		 *
		 * @param document
		 * @param query
		 * @returns {boolean} valid
		 */
		compare: function(document, query){
			var keys = Object.keys(query),
				condition,
				operator;

			for (var i = 0; i < keys.length; i++) {
				condition = { name: keys[i], value: query[keys[i]] };
				if(!document.hasOwnProperty(condition.name) && typeof Query.Operators[condition.name] !== 'function'){
					return false;
				}
				if(typeof Query.Operators[condition.name] === 'function'){
					return Query.Operators[condition.name](document, condition.value)
				}else if(typeof condition.value === 'object'){
					operator = Object.keys(condition.value)[0];
					if(typeof Query.Operators[operator] === 'function'){
						return Query.Operators[operator](document[condition.name], condition.value[operator])
					}else{
						throw new Error("Unrecognised operator '" + operator + "'");
					}
				}else{
					return Query.Operators.$eq(document[condition.name], condition.value);
				}
			}

			return true;
		},

		/**
		 * Comparison operators
		 * @see https://docs.mongodb.org/manual/reference/operator/query-comparison/
		 */
		Operators: {
			/**
			 * Equality test
			 *
			 * @example
			 * Examples.find({ forename: { $eq: 'Foo' } });
			 *
			 * @example
			 * Examples.find({ forename: 'Foo' }); // Shorthand
			 * Examples.find({ forename: { $eq: 'Foo' } });
			 *
			 * @param a
			 * @param b
			 * @return {boolean} result
			 */
			'$eq': function(a,b){
				return a == b;
			},

			/**
			 * Inequality test
			 *
			 * @example
			 * Examples.find({ forename: { $ne: 'Foo' } });
			 *
			 * @param a
			 * @param b
			 * @return {boolean} result
			 */
			'$ne': function(a,b){
				return a != b;
			},

			/**
			 * Or test
			 *
			 * @example
			 * Examples.find({ $or: [{ name:'Foo' },{ name:'Bar' }] });
			 *
			 * @param a
			 * @param b
			 */
			'$or': function(a,b){
				// Throw an error if not passed an array of possibilities
				if(!Utils.isArray(b)){
					throw new Error('$or Operator expects an Array')
				}

				var i;

				if(Utils.isObject(a)){
					for (i = 0; i < b.length; i++) {
						if(Query.compare(a, b[i])){
							return true;
						}
					}
				}else{
					// Test each value from array of possibilities
					for (i = b.length; i >= 0; i--) {
						if(this.$eq(a,b[i])){
							// Satisfied, return true
							return true;
						}
					}
				}

				// Failed to satisfy, return false
				return false;
			},

			/**
			 * Greater than test
			 *
			 * @example
			 * Examples.find({ age: { $gt: 17 } });
			 *
			 * @param a
			 * @param b
			 */
			'$gt': function(a,b){
				return a > b;
			},

			/**
			 * Greater than or equal test
			 *
			 * @example
			 * Examples.find({ age: { $gte: 18 } });
			 *
			 * @param a
			 * @param b
			 */
			'$gte': function(a,b){
				return a >= b;
			},

			/**
			 * Less than test
			 *
			 * @example
			 * Examples.find({ age: { $lt: 18 } });
			 *
			 * @param a
			 * @param b
			 */
			'$lt': function(a,b){
				return a < b;
			},

			/**
			 * Less than or equal test
			 *
			 * @example
			 * Examples.find({ age: { $lte: 18 } });
			 *
			 * @param a
			 * @param b
			 */
			'$lte': function(a,b){
				return a <= b;
			},

			/**
			 * Contains test for strings
			 *
			 * @example
			 * Examples.find({ name: { $contains: "foo" } });
			 *
			 * @param a
			 * @param b
			 */
			'$contains': function(a,b){
				return a.indexOf(b) > -1;
			}
		}
	};

	/**
	 * Store Object
	 *
	 * @example
	 * var store = new Store();
	 *
	 * @returns {Store}
	 */
	function Store(options){
		this.version = '2.0.0';
		this.collections = {};
		this.options = Utils.merge({dbname: "pocket", driver:Pocket.Drivers.DEFAULT}, options || {});

		if(!this.options.driver)
			throw new Error('Storage driver was not found');
		if(this.options.driver === Pocket.Drivers.WEBSQL){
			if(!window.hasOwnProperty("openDatabase"))
				throw new Error('Web SQL is not supported in your browser');
			this.options.driver = openDatabase(this.options.dbname, '1.0', 'Pocket.js datastore', 10 * 1024 * 1024);
		}
	}
	/**
	 * Collection Object
	 * @param name Collection name
	 * @param options Options additional options
	 * @returns {Collection}
	 */
	function Collection(name, options){
		if(!name)
			throw new Error('Collection requires a name');
		this.name = name;
		this.documents = [];
		this.options = Utils.merge({driver:Pocket.Drivers.DEFAULT}, options || {});
		this.length = 0;
		return this;
	}
	/**
	 * Document Object
	 * @param {object} object Document data
	 * @returns {object} Document data
	 */
	function Document(object){
		if(!Utils.isObject(object))
			throw new Error('Invalid argument. Expected an Object.');
		if(object.hasOwnProperty('_id') === false)
			object._id = Utils.uuid();
		this.object = object;
		return this.object;
	}

	Store.prototype = {
		/**
		 * Retrieve a collection from the store.
		 * If the collection does not exist, one will be created
		 * using the name passed to the function
		 *
		 * @example
		 * var Examples = Store.collection('example');
		 *
		 * @param {string} name Collection name
		 * @param {object} [options] Options when creating a new collection
		 * @returns {Collection}
		 */
		collection: function(name, options){
			if(!name)
				throw new Error('Invalid argument. Expected a collection name.');
			var collection = this.collections[name];
			if(!collection){
				collection = new Collection(name, options || this.options);
				this.collections[name] = collection;
			}
			return collection;
		},

		/**
		 * Removes a collection from the store
		 *
		 * @example
		 * Store.removeCollection('example');
		 *
		 * @param {string} name Collection name
		 * @returns {Store}
		 */
		removeCollection: function(name){
			if(!name)
				return this;
			var collection = this.collections[name];
			if(collection){
				collection.destroy();
				delete this.collections[name];
			}
			return this;
		},

		/**
		 * Stores a collection into local storage
		 *
		 * @param {Collection} [name] Collection name to store into local storage
		 */
		commit: function(name){
			if(!name)
				throw new Error('Invalid arguments. Expected collection name');
			var collection = this.collections[name];
			if(collection){
				collection.commit();
			}
			return this;
		},

		/**
		 * Restore previous version of the store.
		 * @param options
		 * @param callback
		 */
		restore: function(options, callback) {
			var self = this;

			if (typeof options === 'function'){
				callback = options;
				options = {};
			}

			callback = callback || function(){};

			if(this.options.driver === Pocket.Drivers.DEFAULT){
				var len = localStorage.length;
				for(; len--;){
					var key = localStorage.key(len);
					if(key.indexOf(this.options.dbname) == 0){
						var row = localStorage.getItem(key);
						if(typeof row === 'string'){
							var data = JSON.parse(row),
								collection;
							collection = new Collection(data.name, data.options);
							collection.documents = data.documents;
							collection.length = data.documents.length;
							this.collections[collection.name] = collection;
						}
					}
				}
			}

			if(this.options.driver.toString() === "[object Database]"){
				this.options.driver.transaction(function(tx) {
					tx.executeSql('SELECT tbl_name from sqlite_master WHERE type = "table" AND tbl_name != "__WebKitDatabaseInfoTable__"', [], function(tx, results){
						var rows = results.rows, count = 0, length = rows.length;
						for(var row in rows){
							if(rows.hasOwnProperty(row)){
								tx.executeSql('SELECT json from ' + rows[row].tbl_name + ' LIMIT 1', [], function(tx, results){
									var rows = results.rows;
									for(var row in rows){
										if(rows.hasOwnProperty(row)){
											var json = rows[row].json;
											if(typeof json === 'string'){
												var data = JSON.parse(json),
													collection;
												collection = new Collection(data.name, data.options);
												collection.documents = data.documents;
												collection.length = data.documents.length;
												self.collections[collection.name] = collection;
											}

											// Increment count or exit
											if(count == length - 1){
												callback(null);
											}else{
												count++;
											}
										}
									}
								});
							}
						}
					}, function(tx, error){
						callback(error);
					});
				});
			}

			return this;
		},

		/**
		 * Clean-up after ourselves
		 */
		destroy: function(){
			for (var collection in this.collections) {
				if(collection instanceof  Collection){
					collection.destroy();
				}
			}
			this.collections = null;
		}
	};
	Collection.prototype = {
		/**
		 * Inserts data into a collection
		 *
		 * @example
		 * var Examples = Store.addCollection('example');
		 * Examples.insert({ forename: 'Foo', surname: 'Bar' });
		 *
		 * @param {object} doc Data to be inserted into the collection
		 * @returns {Document}
		 */
		insert: function(doc){
			var document = new Document(doc);
			this.documents.push(document);
			this.length++;

			if(this.options.autoCommit){
				this.commit();
			}

			return document;
		},

		/**
		 * Returns an array of documents which satisfy the query given
		 *
		 * @example
		 * var Examples = Store.addCollection('example');
		 * Examples.insert({ _id: '1', forename: 'Foo', surname: 'Bar' });
		 * Examples.insert({ _id: '2', forename: 'Bar', surname: 'Foo' });
		 * Examples.insert({ _id: '3', forename: 'Foo', surname: 'Bar' });
		 * console.log(Examples.length) // 2
		 *
		 * var results = Examples.find({ forename: 'Foo' });
		 * console.log(results) // [{ _id: '1', forename: 'Foo', surname: 'Bar' }, { _id: '3', forename: 'Foo', surname: 'Bar' }]
		 *
		 * @param {object|number|string} [query] Query which tests for valid documents
		 * @return {Collection[]}
		 */
		find: function(query){
			var keys,
				results;

			// Get clone of documents in collection
			results = this.documents.slice(0);

			query = Query.format(query);

			// Get query keys
			keys = Object.keys(query);

			while(keys.length > 0){
				// Break out of loop if we have 0 documents in result
				if(results.length === 0){
					break;
				}

				results = results.filter(function(document){
					var part = {};
					part[keys[0]] = query[keys[0]];
					return Query.compare(document, part)
				});

				// Remove query key
				keys.splice(0,1);
			}

			// Return results to caller
			return results;
		},

		/**
		 * Returns the first document which satisfied the query given
		 *
		 * @example
		 * var Examples = Store.addCollection('example');
		 * Examples.insert({ _id: '1', forename: 'Foo', surname: 'Bar' });
		 * Examples.insert({ _id: '2', forename: 'Foo', surname: 'Bar' });
		 * console.log(Examples.length) // 2
		 *
		 * var result = Examples.findOne({ forename: 'Foo', surname: 'Bar' });
		 * console.log(result) // { _id: '1', forename: 'Foo', surname: 'Bar' }
		 *
		 * @param {object|number|string} query Query which tests for valid documents
		 * @return {Collection}
		 */
		findOne: function(query){
			return this.find(query)[0] || null;
		},

		/**
		 * Updates an existing document inside the collection
		 * Supports partial updates
		 *
		 * @example
		 * var Examples = Store.addCollection('example');
		 * Examples.insert({ _id: 0, forename: 'Foo', surname: 'Bar' });
		 * Examples.update({ _id: 0 },{ title: 'Mrs' });
		 *
		 * var result = Examples.findOne({ _id:0 });
		 * console.log(result) // { _id: '0', forename: 'Foo', surname: 'Bar', title: 'Mrs' }
		 *
		 * @param {object|number|string} [query] Query which tests for valid documents
		 * @param {object} doc Data to be inserted into the collection
		 * @returns {Collection}
		 */
		update: function(query, doc){
			var documents = this.find(Query.format(query));

			// Iterate through query results and update
			documents.forEach(function(document){
				// Get index of document in the collection
				var index = this.documents.indexOf(document);

				// If index is not -1 (means it wasn't found in the array)
				if(index !== -1){
					//  Merge currently record with update object
					this.documents[index] = new Document(Utils.merge(this.documents[index], doc));
				}
			}, this);

			if(this.options.autoCommit){
				this.commit();
			}

			// Return collection
			return this;
		},

		/**
		 * Removes documents which satisfy the query given
		 *
		 * @example
		 * var Examples = Store.addCollection('example');
		 * Examples.insert({ _id: '394', forename: 'Foo', surname: 'Bar' });
		 * console.log(Examples.length) // 1
		 * Examples.remove({ _id: '394' });
		 * console.log(Examples.length) // 0
		 *
		 * @example
		 * var Examples = Store.addCollection('example');
		 * Examples.insert({ _id: '394', forename: 'Foo', surname: 'Bar' });
		 * console.log(Examples.length) // 1
		 * Examples.remove({ forename: 'Foo' });
		 * console.log(Examples.length) // 0
		 *
		 * @param {object|number|string} [query] Query which tests for valid documents
		 * @return {Collection}
		 */
		remove: function(query){
			var documents = this.find(Query.format(query));

			// Iterate through query results
			documents.forEach(function(document){
				// Get index of document in the collection
				var index = this.documents.indexOf(document);

				// If index is not -1 (means it wasn't found in the array)
				if(index !== -1){
					// If found in the array, remove it
					this.documents.splice(index, 1);
					// Update the length of the collection
					this.length--;
				}
			}, this);

			if(this.options.autoCommit){
				this.commit();
			}

			// Return collection
			return this;
		},

		/**
		 * Stores the collection into local storage
		 *
		 * @return {Collection}
		 */
		commit: function(callback){
			var name = this.name,
				json = JSON.stringify(this);

			callback = callback || function(){};

			if(this.options.driver === Pocket.Drivers.DEFAULT){
				window.localStorage.setItem(this.options.dbname.concat("." + this.name), json);
			}

			if(this.options.driver.toString() === "[object Database]"){
				this.options.driver.transaction(function(tx) {
					tx.executeSql('DROP TABLE IF EXISTS ' + name);
					tx.executeSql('CREATE TABLE ' + name + ' (json)');
					tx.executeSql('INSERT INTO ' + name + ' (json) VALUES (?)', [json], function(){
						callback(null)
					}, function(tx, error){
						callback(error);
					});
				});
			}

			return this;
		},

		/**
		 * Returns the size of the collection
		 * @returns {Number} size of collection
		 */
		size: function(){
			return this.documents.length;
		},

		/**
		 * Cleans up memory
		 */
		destroy: function(){
			this.documents = this.options = this.name = null;
		}
	};

	return new Store(options);
}
Pocket.Drivers = {
	'DEFAULT': window.localStorage,
	'LOCAL_STORAGE': window.localStorage,
	'WEBSQL': 'WEBSQL'
};