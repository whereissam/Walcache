/// Walrus Blob Registry - Smart contract for managing Walrus blob metadata on Sui
module walrus_blob_registry::blob_registry {
    use std::string::{Self, String};
    use std::vector;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::package;
    use sui::transfer;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};

    // =================== Error Codes ===================
    
    const EBlobAlreadyExists: u64 = 1;
    const EBlobNotFound: u64 = 2;
    const EInvalidBlobId: u64 = 3;
    const ENotAuthorized: u64 = 4;
    const EInvalidSize: u64 = 5;
    const EBlobAlreadyPinned: u64 = 6;
    const EBlobNotPinned: u64 = 7;
    const EArrayLengthMismatch: u64 = 8;

    // =================== Structs ===================

    /// Capability object for admin operations
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Metadata for a Walrus blob
    public struct BlobMetadata has store, copy, drop {
        blob_id: String,
        uploader: address,
        size: u64,
        content_type: String,
        timestamp: u64,
        cdn_url: String,
        is_pinned: bool,
        content_hash: vector<u8>,
    }

    /// Registry object that stores all blob metadata
    public struct BlobRegistry has key {
        id: UID,
        blobs: Table<String, BlobMetadata>,
        uploader_blobs: Table<address, vector<String>>,
        total_blobs: u64,
        total_size: u64,
    }

    /// Batch upload information
    public struct BatchUpload has key, store {
        id: UID,
        blob_ids: vector<String>,
        total_size: u64,
        timestamp: u64,
        uploader: address,
    }

    // =================== Events ===================

    public struct BlobRegistered has copy, drop {
        blob_id: String,
        uploader: address,
        size: u64,
        content_type: String,
        cdn_url: String,
        timestamp: u64,
    }

    public struct BlobPinned has copy, drop {
        blob_id: String,
        operator: address,
        timestamp: u64,
    }

    public struct BlobUnpinned has copy, drop {
        blob_id: String,
        operator: address,
        timestamp: u64,
    }

    public struct BatchRegistered has copy, drop {
        batch_id: ID,
        uploader: address,
        blob_count: u64,
        total_size: u64,
        timestamp: u64,
    }

    // =================== Initialization ===================

    /// Module initializer
    fun init(ctx: &mut TxContext) {
        // Create and share the blob registry
        let registry = BlobRegistry {
            id: object::new(ctx),
            blobs: table::new(ctx),
            uploader_blobs: table::new(ctx),
            total_blobs: 0,
            total_size: 0,
        };
        transfer::share_object(registry);

        // Create admin capability and transfer to deployer
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // =================== Public Functions ===================

    /// Register a new blob with metadata
    public entry fun register_blob(
        registry: &mut BlobRegistry,
        blob_id: String,
        size: u64,
        content_type: String,
        cdn_url: String,
        content_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!string::is_empty(&blob_id), EInvalidBlobId);
        assert!(size > 0, EInvalidSize);
        assert!(!table::contains(&registry.blobs, blob_id), EBlobAlreadyExists);

        let uploader = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        let metadata = BlobMetadata {
            blob_id,
            uploader,
            size,
            content_type,
            timestamp,
            cdn_url,
            is_pinned: false,
            content_hash,
        };

        table::add(&mut registry.blobs, blob_id, metadata);

        // Add to uploader's blob list
        if (!table::contains(&registry.uploader_blobs, uploader)) {
            table::add(&mut registry.uploader_blobs, uploader, vector::empty<String>());
        };
        let uploader_list = table::borrow_mut(&mut registry.uploader_blobs, uploader);
        vector::push_back(uploader_list, blob_id);

        // Update counters
        registry.total_blobs = registry.total_blobs + 1;
        registry.total_size = registry.total_size + size;

        // Emit event
        event::emit(BlobRegistered {
            blob_id,
            uploader,
            size,
            content_type,
            cdn_url,
            timestamp,
        });
    }

    /// Register multiple blobs in batch for gas optimization
    public entry fun register_blob_batch(
        registry: &mut BlobRegistry,
        blob_ids: vector<String>,
        sizes: vector<u64>,
        content_types: vector<String>,
        cdn_urls: vector<String>,
        content_hashes: vector<vector<u8>>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let batch_size = vector::length(&blob_ids);
        assert!(batch_size > 0, EArrayLengthMismatch);
        assert!(
            batch_size == vector::length(&sizes) &&
            batch_size == vector::length(&content_types) &&
            batch_size == vector::length(&cdn_urls) &&
            batch_size == vector::length(&content_hashes),
            EArrayLengthMismatch
        );

        let uploader = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        let mut total_batch_size = 0;
        let mut i = 0;

        // Ensure uploader blob list exists
        if (!table::contains(&registry.uploader_blobs, uploader)) {
            table::add(&mut registry.uploader_blobs, uploader, vector::empty<String>());
        };

        while (i < batch_size) {
            let blob_id = *vector::borrow(&blob_ids, i);
            let size = *vector::borrow(&sizes, i);
            let content_type = *vector::borrow(&content_types, i);
            let cdn_url = *vector::borrow(&cdn_urls, i);
            let content_hash = *vector::borrow(&content_hashes, i);

            assert!(!string::is_empty(&blob_id), EInvalidBlobId);
            assert!(size > 0, EInvalidSize);
            assert!(!table::contains(&registry.blobs, blob_id), EBlobAlreadyExists);

            let metadata = BlobMetadata {
                blob_id,
                uploader,
                size,
                content_type,
                timestamp,
                cdn_url,
                is_pinned: false,
                content_hash,
            };

            table::add(&mut registry.blobs, blob_id, metadata);

            // Add to uploader's blob list
            let uploader_list = table::borrow_mut(&mut registry.uploader_blobs, uploader);
            vector::push_back(uploader_list, blob_id);

            total_batch_size = total_batch_size + size;

            // Emit individual blob registered event
            event::emit(BlobRegistered {
                blob_id,
                uploader,
                size,
                content_type,
                cdn_url,
                timestamp,
            });

            i = i + 1;
        };

        // Update registry counters
        registry.total_blobs = registry.total_blobs + batch_size;
        registry.total_size = registry.total_size + total_batch_size;

        // Create batch upload object
        let batch_upload = BatchUpload {
            id: object::new(ctx),
            blob_ids,
            total_size: total_batch_size,
            timestamp,
            uploader,
        };

        let batch_id = object::id(&batch_upload);

        // Emit batch event
        event::emit(BatchRegistered {
            batch_id,
            uploader,
            blob_count: batch_size,
            total_size: total_batch_size,
            timestamp,
        });

        // Transfer batch upload object to uploader
        transfer::transfer(batch_upload, uploader);
    }

    /// Pin a blob to prevent cache eviction
    public entry fun pin_blob(
        registry: &mut BlobRegistry,
        blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.blobs, blob_id), EBlobNotFound);
        
        let metadata = table::borrow_mut(&mut registry.blobs, blob_id);
        assert!(metadata.uploader == tx_context::sender(ctx), ENotAuthorized);
        assert!(!metadata.is_pinned, EBlobAlreadyPinned);

        metadata.is_pinned = true;

        event::emit(BlobPinned {
            blob_id,
            operator: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Unpin a blob to allow cache eviction
    public entry fun unpin_blob(
        registry: &mut BlobRegistry,
        blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.blobs, blob_id), EBlobNotFound);
        
        let metadata = table::borrow_mut(&mut registry.blobs, blob_id);
        assert!(metadata.uploader == tx_context::sender(ctx), ENotAuthorized);
        assert!(metadata.is_pinned, EBlobNotPinned);

        metadata.is_pinned = false;

        event::emit(BlobUnpinned {
            blob_id,
            operator: tx_context::sender(ctx),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // =================== View Functions ===================

    /// Get blob metadata
    public fun get_blob_metadata(registry: &BlobRegistry, blob_id: String): BlobMetadata {
        assert!(table::contains(&registry.blobs, blob_id), EBlobNotFound);
        *table::borrow(&registry.blobs, blob_id)
    }

    /// Check if blob exists and get basic status
    public fun get_blob_status(registry: &BlobRegistry, blob_id: String): (bool, address, bool) {
        if (table::contains(&registry.blobs, blob_id)) {
            let metadata = table::borrow(&registry.blobs, blob_id);
            (true, metadata.uploader, metadata.is_pinned)
        } else {
            (false, @0x0, false)
        }
    }

    /// Get blob count for an uploader
    public fun get_blob_count(registry: &BlobRegistry, uploader: address): u64 {
        if (table::contains(&registry.uploader_blobs, uploader)) {
            vector::length(table::borrow(&registry.uploader_blobs, uploader))
        } else {
            0
        }
    }

    /// Get all blob IDs for an uploader
    public fun get_uploader_blobs(registry: &BlobRegistry, uploader: address): vector<String> {
        if (table::contains(&registry.uploader_blobs, uploader)) {
            *table::borrow(&registry.uploader_blobs, uploader)
        } else {
            vector::empty<String>()
        }
    }

    /// Verify blob content hash
    public fun verify_blob_hash(registry: &BlobRegistry, blob_id: String, provided_hash: vector<u8>): bool {
        if (table::contains(&registry.blobs, blob_id)) {
            let metadata = table::borrow(&registry.blobs, blob_id);
            metadata.content_hash == provided_hash
        } else {
            false
        }
    }

    /// Get registry statistics
    public fun get_registry_stats(registry: &BlobRegistry): (u64, u64) {
        (registry.total_blobs, registry.total_size)
    }

    /// Check if blob exists
    public fun blob_exists(registry: &BlobRegistry, blob_id: String): bool {
        table::contains(&registry.blobs, blob_id)
    }

    // =================== Admin Functions ===================

    /// Admin function to remove a blob (for moderation)
    public entry fun admin_remove_blob(
        _: &AdminCap,
        registry: &mut BlobRegistry,
        blob_id: String,
        ctx: &mut TxContext
    ) {
        assert!(table::contains(&registry.blobs, blob_id), EBlobNotFound);
        
        let metadata = table::remove(&mut registry.blobs, blob_id);
        
        // Remove from uploader's list
        if (table::contains(&registry.uploader_blobs, metadata.uploader)) {
            let uploader_list = table::borrow_mut(&mut registry.uploader_blobs, metadata.uploader);
            let (found, index) = vector::index_of(uploader_list, &blob_id);
            if (found) {
                vector::remove(uploader_list, index);
            };
        };

        // Update counters
        registry.total_blobs = registry.total_blobs - 1;
        registry.total_size = registry.total_size - metadata.size;
    }

    // =================== Test Functions ===================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}