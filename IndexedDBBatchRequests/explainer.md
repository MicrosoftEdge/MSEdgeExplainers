# IndexedDB: Batch Requests

## Authors:

- Abhishek Shanthkumar
- [Evan Stade](https://github.com/evanstade)
- [Steve Becker](https://github.com/SteveBeckerMSFT)

## Participate

- https://github.com/w3c/IndexedDB/issues/376
- https://github.com/w3c/IndexedDB/issues/69

## Introduction

[`IndexedDB`](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) is a transactional database for client-side storage.  Each record in the database contains a key-value pair.  Clients create requests to read and write records during a transaction.  IndexedDB currently supports the following types of requests:

- Writing a single new record or updating a single existing record.
- Reading a single record or a contiguous range of records.
- Deleting a single record or a contiguous range of records.

This explainer proposes request batching, enabling clients to combine multiple reads, writes, or deletes into a single request.  This explainer introduces new types of requests:

- Writing or updating multiple records.
- Reading multiple ranges of records.
- Deleting multiple ranges of records.

## Goals

Improve throughput by decreasing transaction durations.  Decrease latency of database reads.

By performing multiple operations in a single request, batching reduces the number of JavaScript events required to read records and complete transactions. Each JavaScript event runs as a task on the main JavaScript thread. These tasks can introduce overhead when transactions require a sequence of tasks that go back and forth between the main JavaScript thread and the IndexedDB I/O thread.

Active transactions may block new transactions from starting.  For example, while a read/write transaction is active, a new transaction cannot start until the active read/write transaction completes.  Completing a transaction sooner enables queued transactions to start sooner.

## Non-goals

Combine read, write and delete operations into a single batched request.  This proposal batches requests of the same type only with either batched reads, batched writes or batched deletes.

## Batched reads: `getAll()`, `getAllKeys()`, `getAllRecords()`, `get()`, `getKey()` and `count()`

Adds new function overloads to both [`IDBObjectStore`](https://w3c.github.io/IndexedDB/#object-store-interface) and [`IDBIndex`](https://w3c.github.io/IndexedDB/#index-interface) that require an array of queries to create a batched request.  The request completes with a parallel array of query results.  The results may contain duplicate records with overlapping ranges when given  input with overlapping queries.   

[`getAllRecords()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-getallrecords) introduced the [`IDBGetAllOptions`](https://w3c.github.io/IndexedDB/#dictdef-idbgetalloptions) dictionary input for queries, which [`getAll()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-getall) and [`getAllKeys()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-getallkeys) also accept.  The new function overloads for `getAll()`, `getAllKeys()` and `getAllRecords()` take an array of `IDBGetAllOptions` dictionaries.

[`get()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-get), [`getKey()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-getkey) and [`count()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-count) do not use `IDBGetAllOptions` because they do not support the `count` or `direction` arguments.  Instead, this proposal introduces the `IDBQueryOptions` dictionary that contains a single attribute, `query`.  This proposal updates `IDBGetAllOptions` to inherit `IDBQueryOptions` and then add the `count` and `direction` attributes to support functions like `getAll()`.  The function overloads for `get()`, `getKey()` and `count()` take an array of `IDBQueryOptions` dictionaries, enabling each function to distinguish between a range and an array of query options.  The batch request completes with a parallel array of query results where each item in the array contains a record value, key or count.  Each query that does not match a record uses `undefined` for `get()/getKey()` or `0` for `count()`.

## Batched writes: `putAll()` and `addAll()`

Adds new functions to write an array of records to `IDBObjectStore`.  `putAll()` and `addAll()` extend the existing [`put()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-put) and [`add()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-add) functions.  `put()` and `putAll()` create new records or overwrite existing records.  `add()` and `addAll()` create new records only since they fail when given a record that already exists with the same key.  `putAll()` and `addAll()` requests complete with results containing a parallel array of keys for the records written.

This proposal introduces the `IDBRecordInit` dictionary input for `putAll()` and `addAll()`.  `IDBRecordInit` consists of two attributes: a required `value` and an optional `key`.  Depending on an object store's configuration, new records may not require keys.  Object stores with in-line keys derive their keys from the `value` and must not provide a `key`.  Object stores with a key generator may optionally provide a `key` where new records without a `key` fallback to the key generator to derive their key.  Objects stores with out-of-line keys and no key generator must provide a `key` for new records.

## Batched deletes: `delete()`

Much like `getAll()`, this proposal adds a new function overload for [`delete()`](https://w3c.github.io/IndexedDB/#dom-idbobjectstore-delete) that requires an array of queries.  To distinguish between a key range query and an array of queries, delete uses an array of `IDBQueryOptions` dictionaries.  The input queries may contain duplicate records with overlapping ranges.  `delete()` succeeds when given a query without matching records, enabling duplicate record deletion to also succeed.

## Feature detection

This explainer proposes using `addAll()` or `putAll()` as feature detection for batch request support in `get()`, `getKey()`, `count()`, `getAll()`, and `getAllKeys()`.  Before using the `IDBQueryOptions` dictionary with any of these functions, developers must check for the existence of `addAll()` or `putAll()` in `IDBObjectStore`.  If developers use `IDBQueryOptions` on an unsupported browser, it will fail by throwing an exception since IDBQueryOptions is not a valid key range query.

## Compatibility risks

Overloading `getAll()`, and `getAllKeys()` to accept new types of input introduces compatibility risk.  Prior to this proposal, when passed an array of dictionaries, these functions throw an exception after [failing to convert the dictionary to a key range](https://w3c.github.io/IndexedDB/#convert-a-value-to-a-key-range).  After the overload, these functions will no longer throw for arrays of dictionaries.  When the `IDBGetAllOptions` dictionary initializes with its default values, it creates a query that retrieves all of the keys or values from the entire database.

Similarly, overloading `get()`, `getKey()`, and  `delete()` to accept a dictionary or array of dictionaries introduces the same compatibility risk.  However, unlike `getAll()`, these functions require a non-null query.  This means that when the `IDBQueryOptions`  dictionary initializes with its default values, it will continue to throw exceptions.

Since using an array of dictionaries with these functions is a programming error, web developers should not rely on this behavior, making compat risk low.

## Key scenarios

### Reading from multiple noncontiguous records using a single request

```js
// Start a read-only transaction.
const read_transaction = indexed_database.transaction('my_object_store');
const object_store = read_transaction.objectStore('my_object_store');

// `putAll()` introduced batched request support to pre-existing functions like `get()`.
if ('putAll' in object_store) {  
  // Get 3 values from noncontiguous records.
  let request = object_store.get([ 
    { query: /*key=*/1 }, 
    { query: /*key=*/5 }, 
    { query: /*key=*/9 } 
  ]);
  request.onsuccess = () => {
    // `request.result` is an array of query results.
    const [first_value, fifth_value,  ninth_value] = request.result;
  };
} else {
  // Use multiple `get()` requests as a fallback.
}
```

### Reading multiple ranges of records using a single request

```js
// Get the first and last ten records in `object_store`.
let request = object_store.getAllRecords([ 
  { count: 10 }, 
  { count: 10, direction: 'prev' },
]);
request.onsuccess = () => {
  // `first_ten_records` and `first_ten_records` are each arrays of `IDBRecord` results.
  const [first_ten_records, last_ten_records] = request.result;
};
```

### Writing multiple new records using a single request

```js
// Start a read/write transaction.
const readwrite_transaction = indexed_database.transaction(kObjectStoreName, 'readwrite');
const object_store = readwrite_transaction.objectStore('my_object_store');

if ('putAll' in object_store) {
  // In this example, `my_object_store` has a key generator, making `key` optional 
  // for new records.
  const new_records = [
    {
      value: new_record_1,
    },
    {
      value: new_record_2,
      key: new_key_2,
    },
    {
      value: new_record_3,
    }
  ];
  request = object_store.putAll(new_records);
  request.onsuccess = event => {
    // `key_1` and `key_3` contain keys created by the object store's key generator.
    // `key_2` is `new_key_2` from above.
    const [key_1, key_2, key_3] = request.result;
  };  
} else {
  // Use multiple `put()` requests as a fallback.
} 
```

### Updating multiple existing records using a single request

```js
if ('addAll' in object_store) {
  // For this example, `object_store` uses inline-keys derived from record values.
  // `addAll()` will throw an exception if `new_records` contains a `key`.
  const new_records = [
    {
      value: new_record_1,
    },
    {
      value: new_record_2,
    },
    {
      value: new_record_3,
    }
  ];
  request = object_store.addAll(new_records);
  request.onsuccess = event => {
    // `key_1`, `key_2, `key_3` contain the keys extracted from the values 
    // in `new_records` above.
    const [key_1, key_2, key_3] = request.result;
  };  
} else {
  // Use multiple `add()` requests as a fallback.
} 
```

### Deleting multiple noncontiguous records using a single request

```js
// Start a read/write transaction.
const readwrite_transaction = indexed_database.transaction(kObjectStoreName, 'readwrite');
const object_store = readwrite_transaction.objectStore('my_object_store');

request = object_store.delete([ 
  { query: /*key=*/1 }, 
  { query: /*key=*/5 }, 
  { query: /*key=*/9 } 
]);
request.onsuccess = event => {
  // The records with keys 1, 5, and 9 no longer exists.  
  // `request.result` is undefined for `delete()`.
};   
```

### Deleting multiple ranges of records using a single request

```js
request = object_store.delete([
  {
    query: IDBKeyRange.upperBound(3, /*open=*/true)
  },
  {
    query: IDBKeyRange.lowerBound(7, /*open=*/true)
  }       
]);
request.onsuccess = event => {
  // `delete()` removed all records with keys less than 3 and greater than 7.
};  
```

## WebIDL

```js
dictionary IDBQueryOptions {
  any query = null;
};

dictionary IDBGetAllOptions : IDBQueryOptions {
  [EnforceRange] unsigned long count;
  IDBCursorDirection direction = "next";
};

dictionary IDBRecordInit {
    any key;
    required any value;
};  

[Exposed=(Window,Worker)]
partial interface IDBObjectStore {
  // Overload `get()`, `getKey()`, `count()` and `delete()` to accept `IDBQueryOptions`
  // or `sequence<IDBQueryOptions>`.
  [NewObject, RaisesException] IDBRequest get(any query_or_options_or_options_sequence);
  [NewObject, RaisesException] IDBRequest getKey(any query_or_options_or_options_sequence);  
  [NewObject, RaisesException] IDBRequest count(optional any query_or_options_or_options_sequence);   
  [NewObject, RaisesException] IDBRequest delete(any query_or_options_or_options_sequence);     

  // Overload `getAll()`, `getAllKeys()`, and `getAllRecords()` accept a `sequence<IDBGetAllOptions>`.
  [NewObject, RaisesException]
  IDBRequest getAll(optional any query_or_options_or_options_sequence = null,
                    optional [EnforceRange] unsigned long count);
  [NewObject, RaisesException]
  IDBRequest getAllKeys(optional any query_or_options_or_options_sequence = null,
                        optional [EnforceRange] unsigned long count);
  [NewObject, RaisesException]
  IDBRequest getAllRecords(
    optional (IDBGetAllOptions or sequence<IDBGetAllOptions>) options = {});

  // Add the following new operations:
  [NewObject, RaisesException]
  IDBRequest putAll(sequence<IDBRecordInit> records); 
  [NewObject, RaisesException]
  IDBRequest addAll(sequence<IDBRecordInit> records);
};

[Exposed=(Window,Worker)]
partial interface IDBIndex {
  // Support the same overloads as `IDBObjectStore`: `IDBQueryOptions` or `sequence<IDBQueryOptions>`.
  [NewObject, RaisesException] IDBRequest get(any query_or_options_or_options_sequence);
  [NewObject, RaisesException] IDBRequest getKey(any query_or_options_or_options_sequence);  
  [NewObject, RaisesException] IDBRequest count(optional any query_or_options_or_options_sequence);   

  // Also, support the same overloads as `IDBObjectStore`: `sequence<IDBGetAllOptions>`.
  [NewObject, RaisesException]
  IDBRequest getAll(optional any query_or_options_or_options_sequence = null,
                    optional [EnforceRange] unsigned long count);
  [NewObject, RaisesException]
  IDBRequest getAllKeys(optional any query_or_options_or_options_sequence = null,
                        optional [EnforceRange] unsigned long count);
  [NewObject, RaisesException]
  IDBRequest getAllRecords(
    optional (IDBGetAllOptions or sequence<IDBGetAllOptions>) options = {});
};
```

## Stakeholder Feedback / Opposition

- Web Developers: Positive
  - Developers requested this feature through the W3C IndexedDB GitHub issues: 
    - See [[1]](https://github.com/w3c/IndexedDB/issues/376), [[2]](https://github.com/w3c/IndexedDB/issues/69).
  - Popular libraries provide polyfills.  
    - Dexie.js defines [bulkGet()](https://dexie.org/docs/Table/Table.bulkGet()), [bulkPut()](https://dexie.org/docs/Table/Table.bulkPut()), [bulkAdd()](https://dexie.org/docs/Table/Table.bulkAdd()), and [bulkDelete()](https://dexie.org/docs/Table/Table.bulkDelete()).
- Chromium: Positive
- Webkit: No signals
- Gecko: No signals

## References & acknowledgements

Special thanks to [Joshua Bell](https://github.com/inexorabletash) who proposed `addAll()` and `putAll()` in the [W3C IndexedDB issue](https://github.com/w3c/IndexedDB/issues/69).