# Why Jeep-SQLite?

We use [Jeep-SQLite](https://github.com/capacitor-community/sqlite) as our local database engine for several reasons:

- **True SQLite everywhere:** Jeep-SQLite provides a real SQLite engine in the browser (via WebAssembly) and on mobile (iOS/Android) via Capacitor plugins. This ensures the same database code and schema work seamlessly across all platforms.
- **Offline-first:** Enables robust offline support with full SQL capabilities, transactions, and relational data, which is critical for our offline-first architecture.
- **Cross-platform consistency:** Unlike IndexedDB, LocalStorage, or other browser-only solutions, Jeep-SQLite guarantees the same behavior and performance on web, iOS, and Android.
- **Open source and actively maintained:** See the official repo: https://github.com/capacitor-community/sqlite

### References
- [Jeep-SQLite documentation](https://github.com/capacitor-community/sqlite)
- [Why use SQLite in the browser? (Jeep-SQLite author)](https://github.com/capacitor-community/sqlite#jeep-sqlite)
- [Capacitor Community SQLite Plugin](https://github.com/capacitor-community/sqlite)

---

*This choice enables us to deliver a reliable, offline-capable, and cross-platform experience for all users.*
