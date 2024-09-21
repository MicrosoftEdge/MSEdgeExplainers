# IndexedDB: getAllEntries()

## Author:
- [Steve Becker](https://github.com/SteveBeckerMSFT)

## Participate
- https://github.com/w3c/IndexedDB/issues/206

## Introduction

[`IndexedDB`](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is a transactional database for client-side storage.  Each record in the database contains a key-value pair.  [`getAll()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll) enumerates database record values sorted by key in ascending order.  [`getAllKeys()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAllKeys) enumerates database record primary keys sorted by key in ascending order.

This explainer proposes a new operation, `getAllEntries()`, which combines [`getAllKeys()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAllKeys) with [`getAll()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll) to enumerate both primary keys and values at the same time.  For an [`IDBIndex`](https://developer.mozilla.org/en-US/docs/Web/API/IDBIndex), `getAllEntries()` also provides the record's index key in addition to the primary key and value.  Lastly, `getAllEntries()` offers a new option to enumerate records sorted by key in descending order.

## WebIDL

```js
dictionary IDBGetAllEntriesOptions {
  // A key or an `IDBKeyRange` identifying the records to retrieve.
  any query = null;

  //  The maximum number of results to retrieve.
  [EnforceRange] unsigned long count;

  // Determines how to enumerate and sort results.
  // Use 'prev' to enumerate and sort results by key in descending order.
  IDBCursorDirection direction = 'next';
}; 

[Exposed=(Window,Worker)]
partial interface IDBObjectStore {
  // After the `getAllEntries()` request completes, the `IDBRequest::result` property
  // contains an array of entries:
  // `[[primaryKey1, value1], [primaryKey2, value2], ... ]`  
  [NewObject, RaisesException]
  IDBRequest getAllEntries(optional IDBGetAllEntriesOptions options = {});
}

[Exposed=(Window,Worker)]
partial interface IDBIndex {
  // Produces the same type of results as `IDBObjectStore::getAllEntries()` above, 
  // but each entry also includes the record's index key at array index 2:
  // `[[primaryKey1, value1, indexKey1], [primaryKey2, value2, indexKey2], ... ]`
  [NewObject, RaisesException]
  IDBRequest getAllEntries(optional IDBGetAllEntriesOptions options = {});
}
```

## Goals

Decrease the latency of database read operations.  By retrieving the primary key, value and index key for database records through a single operation, `getAllEntries()` reduces the number of JavaScript events required to read records.  Each JavaScript event runs as a task on the main JavaScript thread.  These tasks can introduce overhead when reading records requires a sequence of tasks that go back and forth between the main JavaScript thread and the IndexedDB I/O thread.

For batched record iteration, for example, retrieving N records at a time, the primary and index keys provided by `getAllEntries()` can eliminate the need for an [`IDBCursor`](https://developer.mozilla.org/en-US/docs/Web/API/IDBCursor), which further reduces the number of JavaScript events required.  To read the next N records, instead of advancing a cursor to determine the range of the next batch, getAllEntries() can use the primary key or the index key retrieved by the results from the previous batch.

## Key scenarios

### Support paginated cursors using batched record iteration

Many scenarios read N database records at a time, waiting to read the next batch of records until needed.  For example, a UI may display N records, starting with the last record in descending order.  As the user scrolls, the UI will display new content by reading the next N records.

To support this access pattern, the UI calls `getAllEntries()` with the options `direction: 'prev'` and `count: N` to retrieve N records at a time in descending order.  After the initial batch, the UI must specify the upper bound of the next batch using the primary key or index key from the `getAllEntries()` results of the previous batch.

```js
// Define a helper that creates a basic read transaction using `getAllEntries()`.
// Wraps the transaction in a promise that resolves with the query results or 
// rejects after an error.  Queries `object_store_name` unless `optional_index_name`
// is defined.
async function get_all_entries_with_promise(
  database, object_store_name, query_options, optional_index_name) {
  return await new Promise((fulfill, reject) => {
    // Create a read-only transaction.
    const read_transaction = database.transaction(object_store_name, 'readonly');
    const object_store = read_transaction.objectStore(object_store_name);
    
    let query_target = object_store;
    if (optional_index_name) {
      query_target = object_store.index(optional_index_name);
    }

    // Start the `getAllEntries()` request.
    const request = query_target.getAllEntries(query_options);

    // Resolve the promise with the array of entries after success.
    request.onsuccess = event => {
      fulfill(request.result);
    };

    // Reject promise with an error after failure.
    request.onerror = () => { reject(request.error); };
    read_transaction.onerror = () => { reject(read_transaction.error); };
  });
}

// Create a simple reverse iterator where each call to `next()` retrieves
// `batch_size` database records in descending order from an `IDBIndex` with 
// unique keys.
function reverse_idb_index_iterator(
  database, object_store_name, index_name, batch_size) {
  // Define iterator state. 
  let done = false;

  // Begin the iteration unbounded to retrieve the last records in the 'IDBIndex'.
  let next_upper_bound = null;

  // Gets the next `batch_size` entries.
  this.next = async function () {
    if (done) {
      return [];
    }

    let query;
    if (next_upper_bound) {
      query = IDBKeyRange.upperBound(next_upper_bound, /*is_exclusive=*/true);
    } else {
      // The very first query retrieves the last `batch_size` records.
    }

    const entries = await get_all_entries_with_promise(
      database, object_store_name, 
      /*options=*/{ query, count: batch_size, direction: 'prev' }, index_name);
    
    if (entries.length > 0) {
      // Store the upper bound for the next iteration.
      const last_entry = entries[entries.length-1];
      next_upper_bound = /*index_key=*/last_entry[2];
    } else {
      // We've iterated through all the database records!
      done = true;
    }
    return entries;
  };
};

// Get the last 5 records in the `IDBIndex` named `my_index`.
const reverse_iterator = new reverse_idb_index_iterator(
  database, 'my_object_store', 'my_index', /*batch_size=*/5);

let results = await reverse_iterator.next();

// Get the next batch of 5 records.
results = await reverse_iterator.next();
``` 

### Read query results into a Map or Object

Developers may use the results from `getAllEntries()` to construct a new [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [`Object`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) that contains a key-value pair for each database record returned by the query.

```js
// These examples use the `get_all_entries_with_promise()` helper defined above.
// 
// Example 1: Read the first 5 database records from the `IDBObjectStore` into a `Map`.
const result_map = new Map(
  await get_all_entries_with_promise(
    database, 'my_object_store', /*query_options=*/{ count: 5 }));

// Returns the database record value for `key` when the record exists in `result_map`.
let value = result_map.get(key); 

// Use the following to create an iterator for each database record in `result_map`:
const primary_key_iterator = result_map.keys();
const value_iterator = result_map.values();  
const entry_iterator = result_map.entries(); // Enumerate both primary keys and values.

// Example 2: Read the database records from range `min_key` to `max_key` into an `Object`.
const result_object = Object.fromEntries(
  await get_all_entries_with_promise(
    database, 'my_object_store', /*query_options=*/{ query: IDBKeyRange.bound(min_key, max_key) }));

// Returns the database record value for `key` when the record exists in `result_object`.
value = result_object[key];

// Use the following to create an array containing each database record in `result_object`:
const keys = Object.keys(result_object);
const values = Object.values(result_object);
const entries = Object.entries(result_object); // Produces the same array of key/value pairs
                                               // as `IDBObjectStore::getAllEntries()`.
```

## Stakeholder Feedback / Opposition

- Web Developers: Positive
  - Developers have reported the limitations addressed by `getAllEntries()`.  A few examples:
    - ["You cannot build a paginated cursor in descending order."](https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/)
    - ["An example where getAll() could help but needs to retrieve the index key and primary key."](https://stackoverflow.com/questions/44349168/speeding-up-indexeddb-search-with-multiple-workers)
- Chromium: Positive
- Webkit: No signals
- Gecko: No signals

## References & acknowledgements

Special thanks to [Joshua Bell](https://github.com/inexorabletash) who proposed `getAllEntries()` in the [W3C IndexedDB issue](https://github.com/w3c/IndexedDB/issues/206).

Many thanks for valuable feedback and advice from:

- [Rahul Singh](https://github.com/rahulsingh-msft)
- [Foromo Daniel Soromou](https://github.com/fosoromo_microsoft)