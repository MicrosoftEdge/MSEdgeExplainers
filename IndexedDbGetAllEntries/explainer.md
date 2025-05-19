# IndexedDB: getAllRecords()

## Author:

- [Steve Becker](https://github.com/SteveBeckerMSFT)

## Participate

- https://github.com/w3c/IndexedDB/issues/206
- https://github.com/w3c/IndexedDB/issues/130

## Introduction

[`IndexedDB`](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is a transactional database for client-side storage. Each record in the database contains a key-value pair. [`getAll()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll) enumerates database record values sorted by key in ascending order. [`getAllKeys()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAllKeys) enumerates database record primary keys sorted by key in ascending order.

This explainer proposes a new operation, `getAllRecords()`, which combines [`getAllKeys()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAllKeys) with [`getAll()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll) to enumerate both primary keys and values at the same time. For an [`IDBIndex`](https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex), `getAllRecords()` also provides the record's index key in addition to the primary key and value. Lastly, `getAllRecords()` offers a new direction option to enumerate records sorted by key in descending order.

To add the direction option to the existing `getAll()` and `getAllKeys()` operations, this explainer proposes new function overloads that accept the same argument as `getAllRecords()`: the `IDBGetAllOptions` dictionary.

## Goals

Decrease the latency of database read operations. By retrieving the primary key, value and index key for database records through a single operation, `getAllRecords()` reduces the number of JavaScript events required to read records. Each JavaScript event runs as a task on the main JavaScript thread. These tasks can introduce overhead when reading records requires a sequence of tasks that go back and forth between the main JavaScript thread and the IndexedDB I/O thread.

For batched record iteration, for example, retrieving *N* records at a time, the primary and index keys provided by `getAllRecords()` can eliminate the need for an [`IDBCursor`](https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor), which further reduces the number of JavaScript events required. To read the next *N* records, instead of advancing a cursor to determine the range of the next batch, getAllRecords() can use the primary key or the index key retrieved by the results from the previous batch.

Update the existing operations `getAll()` and `getAllKeys()` to support the same query options as `getAllRecords()`, which adds direction.  For some scenarios, `getAll()` and `getAllKeys()` may suffice.  For example, developers may use `getAllKeys()` to defer loading values until needed.  For records with inline keys, `getAll()` already retrieves both key and value.

## `IDBObject::getAllRecords()` and `IDBIndex::getAllRecords()`

This explainer proposes adding `getAllRecords()` to both [`IDBObjectStore`](https://www.w3.org/TR/IndexedDB/#idbobjectstore) and [`IDBIndex`](https://www.w3.org/TR/IndexedDB/#idbindex). `getAllRecords()` creates a new `IDBRequest` that queries its `IDBObjectStore` or `IDBIndex` owner. The `IDBRequest` completes with an array of `IDBRecord` results. Each `IDBRecord` contains the `key`, `primaryKey` and `value` attributes. For `IDBIndex`, `key` is the record's index key. For `IDBObjectStore`, both `key` and `primaryKey` return the same value. The pre-existing [`IDBCursorWithValue`](https://www.w3.org/TR/IndexedDB/#idbcursorwithvalue) interface contains the same attributes and values for both `IDBObjectStore` and `IDBIndex`. However, unlike `getAllRecords()`, a cursor may only read one record at a time.

## Adding direction to `getAll()` and `getAllKeys()`

This explainer proposes using `getAllRecords()` as feature detection for direction support in `getAllKeys()` and `getAll()`.  `getAllRecords()` introduces the `IDBGetAllOptions` dictionary, which developers may also use with `getAll()` and `getAllKeys()`.  Before using `IDBGetAllOptions`, developers must check for the existence of `getAllRecords()` in `IDBObjectStore` or `IDBIndex`.

## Compatibility risk

Overloading `getAll()` and `getAllKeys()` to accept the `IDBGetAllOptions` dictionary introduces compatibility risk.  Prior to this proposal, when passed a dictionary argument, both `getAll()` and `getAllKeys()` throw an exception after [failing to convert the dictionary to a key range](https://w3c.github.io/IndexedDB/#convert-a-value-to-a-key-range).  After the overload, `getAllKeys()` and `getAll()` will no longer throw for dictionary input.  When the `IDBGetAllOptions` dictionary initializes with its default values, it creates a query that retrieves all of the keys or values from the entire database.

Since using a dictionary with `getAll()` and `getAllKeys()` is a programming error, we believe compat risk is low.

## Key scenarios

### Read multiple database records through a single request

```js
// Define a helper that creates a basic read transaction using `getAllRecords()`.
// Wraps the transaction in a promise that resolves with the query results or
// rejects after an error.  Queries `object_store_name` unless `optional_index_name`
// is defined.
async function get_all_records_with_promise(
  database,
  object_store_name,
  query_options,
  optional_index_name
) {
  return await new Promise((fulfill, reject) => {
    // Create a read-only transaction.
    const read_transaction = database.transaction(
      object_store_name,
      "readonly"
    );

    // Get the object store or index to query.
    const object_store = read_transaction.objectStore(object_store_name);
    let query_target = object_store;
    if (optional_index_name) {
      query_target = object_store.index(optional_index_name);
    }

    // Start the getAllRecords() request.
    const request = query_target.getAllRecords(query_options);

    // Resolve promise with results after success.
    request.onsuccess = (event) => {
      fulfill(request.result);
    };

    // Reject promise with error after failure.
    request.onerror = () => {
      reject(request.error);
    };
    read_transaction.onerror = () => {
      reject(read_transaction.error);
    };
  });
}

// Read the first 5 records from an object store in the database.
const records = await get_all_records_with_promise(
  database,
  kObjectStoreName,
  /*query_options=*/ { count: 5 }
);
console.log(
  "The second record in the database contains: " +
    `primaryKey: ${records[1].primaryKey}, key: ${records[1].key}, value: ${records[1].value}`
);
```

### Read multiple database records into a Map

Developers may use the results from `getAllRecords()` to construct a new [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) that contains a key-value pair for each database record returned by the query.

```js
// This example uses the `get_all_records_with_promise()` helper defined above.
//
// Read the last 9 records from an index.
const records = await get_all_records_with_promise(
  database,
  kObjectStoreName,
  /*query_options=*/ { count: 9, direction: 'prev' },
  kIndexName
);

// Map the record's index key to the record's value
const map = new Map(records.map(({ key, value }) => [key, value]));

// Returns the database record value for the index `key` when the record exists 
// in `map`.
const value = map.get(key);

// Use the following to create an iterator for each database record in `map`:
const index_key_iterator = map.keys();
const value_iterator = map.values();
const entry_iterator = map.entries(); // Enumerate both index keys and values.
```

### Support paginated cursors using batch record iteration

Many scenarios read *N* database records at a time, waiting to read the next batch of records until needed.  For example, a UI may display *N* records, starting with the last record in descending order.  As the user scrolls, the UI will display new content by reading the next *N* records.

To support this access pattern, the UI calls `getAllRecords()` with the options `direction: 'prev'` and `count: N` to retrieve *N* records at a time in descending order.  After the initial batch, the UI must specify the upper bound of the next batch using the primary key or index key from the `getAllRecords()` results of the previous batch.

```js
// This example uses the `get_all_records_with_promise()` helper defined above.
//
// Create a batch iterator where each call to `next()` retrieves `batch_size` database 
// records in `direction` order from `object_store_name` or `optional_index_name`.
async function* idb_batch_record_iterator(
  database,
  object_store_name,
  direction,
  batch_size,
  optional_index_name
) {
  let is_done = false;
  
  // Begin the iteration unbounded to retrieve the first or last `batch_size` records.
  let query;
  
  while (!is_done) {
    const records = await get_all_records_with_promise(
      database,
      object_store_name,
      /*query_options=*/ { query, count: batch_size, direction },
      optional_index_name
    );

    if (records.length < batch_size) {
      // We've iterated through all the database records!
      is_done = true;
      return records;
    }

    // Store the lower or upper bound for the next iteration.
    const last_record = records[records.length - 1];
    if (direction === "next" || direction === "nextunique") {
      query = IDBKeyRange.lowerBound(last_record.key, /*exclusive=*/ true);
    } else { // direction === 'prev' || direction === 'prevunique'
      query = IDBKeyRange.upperBound(last_record.key, /*exclusive=*/ true);
    }
    yield records;
  }
}

// Create a reverse iterator that reads 5 records from an index at a time.
const reverse_iterator = idb_batch_record_iterator(
  database,
  "my_object_store",
  /*direction=*/ "prev",
  /*batch_size=*/ 5,
  "my_index"
);

// Get the last 5 records.
let results = await reverse_iterator.next();
let records = results.value;
console.log(
  "The first record contains: " +
    `primaryKey: ${records[0].primaryKey}, key: ${records[0].key}, value: ${records[0].value}`
);

// Get the next batch of 5 records.
if (!results.done) {
  results = await reverse_iterator.next();
}
```

### Use direction with `getAllKeys()` after feature detection

`getAllRecords()` introduces the `IDBGetAllOptions` dictionary, which developers may also use with `getAll()` and `getAllKeys()`.  Before using `IDBGetAllOptions`, developers must check for the existence of `getAllRecords()` in `IDBObjectStore` or `IDBIndex`.

```js
const read_transaction = database.transaction('my_object_store', "readonly");
const object_store = read_transaction.objectStore('my_object_store');

// Use feature detection to determine if this browser supports `getAllRecords()`.
if ('getAllRecords' in object_store) {
  // Request the last 5 primary keys in `object_store`.
  const get_all_options = {
    direction = 'prev',
    count: 5    
  };
  const request = object_store.getAllKeys(get_all_options);
} else {
  // Fallback to a cursor with direction: 'prev' for this query.
}
```

## Considered alternatives

### `getAllEntries()`

Similar to `getAllRecords()` but [provides results as an array of entries](https://github.com/w3c/IndexedDB/issues/206#issuecomment-566205600).  Each entry is a two or three element array containing the record's key, value and optional index key.  For example:

`IDBObjectStore` entries provide array values with two elements:  `[ [primaryKey1, value1], [primaryKey2, value2], ... ]`

`IDBIndex` entries provide array values with three elements: `[ [primaryKey1, value1, indexKey1], [primaryKey2, value2, indexKey2], ... ]`

Developers may directly use the entry results to construct a `Map` or `Object` since the entry results are inspired by ECMAScript's [Map.prototype.entries()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries).  However, `getAllEntries()` has unusual ergonomics, requiring indices like `0` and `1` to access the record properties like `key` and `value`.  Also, IndexedDB database records do not map cleanly to ECMAScript entries.  For `IDBIndex`, the results contain a third element for index key.  For an alternate form, `[[ indexKey1, [ primaryKey1, value1]], [ indexKey2, [ primaryKey2, value2]], ... ]`, the index key cannot always serve as the entry's key since the index key may not be unique across all records.

## WebIDL

```js
dictionary IDBGetAllOptions {
  // A key or an `IDBKeyRange` identifying the records to retrieve.
  any query = null;

  //  The maximum number of results to retrieve.
  [EnforceRange] unsigned long count;

  // Determines how to enumerate and sort results.
  // Use 'prev' to enumerate and sort results by key in descending order.
  IDBCursorDirection direction = 'next';
};

interface IDBRecord {
  // For `IDBIndex` records, `key` is the index key.  For `IDBObjectStore`
  // records, `key` is the same as `primaryKey`.
  readonly attribute any key;
  readonly attribute any primaryKey;
  readonly attribute any value;
};

[Exposed=(Window,Worker)]
partial interface IDBObjectStore {
  // After the `getAllRecords()` request completes, the `IDBRequest::result` property
  // contains an array of records:
  // `[[primaryKey1, value1], [primaryKey2, value2], ... ]`
  [NewObject, RaisesException]
  IDBRequest getAllRecords(optional IDBGetAllRecordsOptions options = {});

  // For `getAll()` and `getAllKeys()`, add support for the direction option
  // through a new overload, which accepts a `IDBGetAllOptions` dictionary as
  // the first and only argument.
  // 
  // IDBRequest getAll(optional IDBGetAllOptions options);
  // IDBRequest getAllKeys(optional IDBGetAllOptions options);
  // 
  [NewObject, RaisesException]
  IDBRequest getAll(optional any query_or_options = null,
                    optional [EnforceRange] unsigned long count);  
  [NewObject, RaisesException]
  IDBRequest getAllKeys(optional any query_or_options = null,
                        optional [EnforceRange] unsigned long count);                    
}

[Exposed=(Window,Worker)]
partial interface IDBIndex {
  // Produces the same type of results as `IDBObjectStore::getAllRecords()` above,
  // but each entry also includes the record's index key at array index 2:
  // `[[primaryKey1, value1, indexKey1], [primaryKey2, value2, indexKey2], ... ]`
  [NewObject, RaisesException]
  IDBRequest getAllRecords(optional IDBGetAllRecordsOptions options = {});

  // Like `IDBObjectStore` above, IDBIndex overloads `getAll()` and `getAllKeys()`
  // to support direction:
  //
  // IDBRequest getAll(optional IDBGetAllOptions options);
  // IDBRequest getAllKeys(optional IDBGetAllOptions options);
  // 
  [NewObject, RaisesException]
  IDBRequest getAll(optional any query_or_options = null,
                    optional [EnforceRange] unsigned long count);  
  [NewObject, RaisesException]
  IDBRequest getAllKeys(optional any query_or_options = null,
                        optional [EnforceRange] unsigned long count);     
}
```

## Stakeholder Feedback / Opposition

- Web Developers: Positive
  - Developers have reported the limitations addressed by `getAllRecords()`. A few examples:
    - ["You cannot build a paginated cursor in descending order."](https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/)
    - ["An example where getAll() could help but needs to retrieve the index key and primary key."](https://stackoverflow.com/questions/44349168/speeding-up-indexeddb-search-with-multiple-workers)
- Chromium: Positive
- Webkit: No signals
- Gecko: No signals

## References & acknowledgements

Special thanks to [Joshua Bell](https://github.com/inexorabletash) who proposed `getAllRecords()` in the [W3C IndexedDB issue](https://github.com/w3c/IndexedDB/issues/206).

Many thanks for valuable feedback and advice from:

- [Rahul Singh](https://github.com/rahulsingh-msft)
- [Foromo Daniel Soromou](https://github.com/fosoromo_microsoft)
