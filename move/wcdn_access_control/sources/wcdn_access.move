/// WCDN Access Control Module
/// Provides various access control patterns for Seal-encrypted content on WCDN
module wcdn_access_control::wcdn_access {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::vec_set::{Self, VecSet};

    // ==================== Error Codes ====================
    
    const ENotOwner: u64 = 1;
    const ENotInAllowlist: u64 = 2;
    const ETimeExpired: u64 = 3;
    const EInsufficientPayment: u64 = 4;
    const EAlreadyInAllowlist: u64 = 5;
    const ENotFound: u64 = 6;

    // ==================== Core Structs ====================

    /// Content metadata and access control info
    struct ContentInfo has key, store {
        id: UID,
        content_id: vector<u8>,
        owner: address,
        title: option::Option<vector<u8>>,
        description: option::Option<vector<u8>>,
        created_at: u64,
    }

    /// Simple owner-only access control
    struct OwnerOnlyAccess has key, store {
        id: UID,
        content_id: vector<u8>,
        owner: address,
    }

    /// Allowlist-based access control
    struct AllowlistAccess has key, store {
        id: UID,
        content_id: vector<u8>,
        owner: address,
        allowed_users: VecSet<address>,
    }

    /// Time-based access control
    struct TimeBasedAccess has key, store {
        id: UID,
        content_id: vector<u8>,
        owner: address,
        expires_at: u64,
    }

    /// Public access (anyone can decrypt)
    struct PublicAccess has key, store {
        id: UID,
        content_id: vector<u8>,
        owner: address,
    }

    // ==================== Seal Approve Functions ====================

    /// Owner-only access: Only the content owner can decrypt
    entry fun seal_approve_owner_only(
        id: vector<u8>,
        access: &OwnerOnlyAccess,
        ctx: &TxContext
    ) {
        assert!(access.content_id == id, ENotFound);
        assert!(access.owner == tx_context::sender(ctx), ENotOwner);
        // Access granted - function returns without abort
    }

    /// Allowlist access: Only users in the allowlist can decrypt
    entry fun seal_approve_allowlist(
        id: vector<u8>,
        access: &AllowlistAccess,
        ctx: &TxContext
    ) {
        assert!(access.content_id == id, ENotFound);
        let sender = tx_context::sender(ctx);
        assert!(
            access.owner == sender || vec_set::contains(&access.allowed_users, &sender),
            ENotInAllowlist
        );
        // Access granted
    }

    /// Time-based access: Anyone can decrypt before expiration
    entry fun seal_approve_time_based(
        id: vector<u8>,
        access: &TimeBasedAccess,
        clock: &Clock,
        _ctx: &TxContext
    ) {
        assert!(access.content_id == id, ENotFound);
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time <= access.expires_at, ETimeExpired);
        // Access granted
    }

    /// Public access: Anyone can decrypt anytime
    entry fun seal_approve_public(
        id: vector<u8>,
        access: &PublicAccess,
        _ctx: &TxContext
    ) {
        assert!(access.content_id == id, ENotFound);
        // Access granted to everyone
    }

    // ==================== Management Functions ====================

    /// Create content info object
    public entry fun create_content_info(
        content_id: vector<u8>,
        title: option::Option<vector<u8>>,
        description: option::Option<vector<u8>>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let content_info = ContentInfo {
            id: object::new(ctx),
            content_id,
            owner: tx_context::sender(ctx),
            title,
            description,
            created_at: clock::timestamp_ms(clock),
        };
        transfer::share_object(content_info);
    }

    /// Create owner-only access control
    public entry fun create_owner_only_access(
        content_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let access = OwnerOnlyAccess {
            id: object::new(ctx),
            content_id,
            owner: tx_context::sender(ctx),
        };
        transfer::share_object(access);
    }

    /// Create allowlist access control
    public entry fun create_allowlist_access(
        content_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let access = AllowlistAccess {
            id: object::new(ctx),
            content_id,
            owner: tx_context::sender(ctx),
            allowed_users: vec_set::empty(),
        };
        transfer::share_object(access);
    }

    /// Create time-based access control
    public entry fun create_time_based_access(
        content_id: vector<u8>,
        expires_at: u64,
        ctx: &mut TxContext
    ) {
        let access = TimeBasedAccess {
            id: object::new(ctx),
            content_id,
            owner: tx_context::sender(ctx),
            expires_at,
        };
        transfer::share_object(access);
    }

    /// Create public access control
    public entry fun create_public_access(
        content_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let access = PublicAccess {
            id: object::new(ctx),
            content_id,
            owner: tx_context::sender(ctx),
        };
        transfer::share_object(access);
    }

    /// Add user to allowlist (owner only)
    public entry fun add_to_allowlist(
        access: &mut AllowlistAccess,
        user: address,
        ctx: &TxContext
    ) {
        assert!(access.owner == tx_context::sender(ctx), ENotOwner);
        assert!(!vec_set::contains(&access.allowed_users, &user), EAlreadyInAllowlist);
        vec_set::insert(&mut access.allowed_users, user);
    }

    /// Remove user from allowlist (owner only)
    public entry fun remove_from_allowlist(
        access: &mut AllowlistAccess,
        user: address,
        ctx: &TxContext
    ) {
        assert!(access.owner == tx_context::sender(ctx), ENotOwner);
        assert!(vec_set::contains(&access.allowed_users, &user), ENotFound);
        vec_set::remove(&mut access.allowed_users, &user);
    }

    /// Update time-based access expiration (owner only)
    public entry fun update_expiration(
        access: &mut TimeBasedAccess,
        new_expires_at: u64,
        ctx: &TxContext
    ) {
        assert!(access.owner == tx_context::sender(ctx), ENotOwner);
        access.expires_at = new_expires_at;
    }

    // ==================== View Functions ====================

    /// Get content info
    public fun get_content_info(content: &ContentInfo): (vector<u8>, address, u64) {
        (content.content_id, content.owner, content.created_at)
    }

    /// Check if user is in allowlist
    public fun is_in_allowlist(access: &AllowlistAccess, user: address): bool {
        vec_set::contains(&access.allowed_users, &user)
    }

    /// Get allowlist size
    public fun get_allowlist_size(access: &AllowlistAccess): u64 {
        vec_set::size(&access.allowed_users)
    }

    /// Check if time-based access is still valid
    public fun is_time_valid(access: &TimeBasedAccess, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time <= access.expires_at
    }

    /// Get access type identifier
    public fun get_owner_only_content_id(access: &OwnerOnlyAccess): vector<u8> {
        access.content_id
    }

    public fun get_allowlist_content_id(access: &AllowlistAccess): vector<u8> {
        access.content_id
    }

    public fun get_time_based_content_id(access: &TimeBasedAccess): vector<u8> {
        access.content_id
    }

    public fun get_public_content_id(access: &PublicAccess): vector<u8> {
        access.content_id
    }
}