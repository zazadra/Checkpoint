/// WalSign — Decentralized Document Signing on Sui + Walrus
/// 
/// Architecture:
/// - SigningRequest is a shared object so all signers can call sign() directly
/// - Document lives on Walrus (blob_id stored here)
/// - SHA-256 hash of document stored on-chain for trustless verification
/// - Events emitted for indexing via Tatum Data API
module walsign::walsign {
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::String;

    // -------------------------------------------------------------------------
    // Error codes
    // -------------------------------------------------------------------------

    /// Caller is not listed as a required signer
    const ENotAuthorized: u64 = 1;
    /// Signer has already signed this request
    const EAlreadySigned: u64 = 2;
    /// Signing request is already completed (all signatures collected)
    const EAlreadyCompleted: u64 = 3;
    /// Only the creator can revoke a request
    const ENotCreator: u64 = 4;
    /// Cannot revoke a completed request
    const ECannotRevokeCompleted: u64 = 5;

    // -------------------------------------------------------------------------
    // Core structs (Move 2024 requires 'public struct')
    // -------------------------------------------------------------------------

    /// A signing request — shared object so all signers can interact directly.
    /// The document lives on Walrus; only its blob_id and SHA-256 hash are stored here.
    public struct SigningRequest has key {
        id: UID,
        /// Human-readable title of the document
        title: String,
        /// Walrus blob ID of the uploaded document
        blob_id: String,
        /// SHA-256 hex hash of the document (for trustless verification)
        document_hash: String,
        /// Creator's wallet address
        creator: address,
        /// Addresses that must sign
        required_signers: vector<address>,
        /// Addresses that have already signed (append-only)
        signed_by: vector<address>,
        /// Unix timestamp ms when request was created
        created_at: u64,
        /// True when all required_signers have signed
        completed: bool,
        /// True if creator has revoked before completion
        revoked: bool,
        /// Optional message/context from creator
        message: String,
    }

    // -------------------------------------------------------------------------
    // Events (indexed by Tatum Data API)
    // -------------------------------------------------------------------------

    public struct RequestCreated has copy, drop {
        request_id: address,
        creator: address,
        blob_id: String,
        document_hash: String,
        title: String,
        signer_count: u64,
        created_at: u64,
    }

    public struct DocumentSigned has copy, drop {
        request_id: address,
        signer: address,
        signed_at: u64,
        total_signed: u64,
        total_required: u64,
        completed: bool,
    }

    public struct RequestRevoked has copy, drop {
        request_id: address,
        creator: address,
        revoked_at: u64,
    }

    // -------------------------------------------------------------------------
    // Public entry functions
    // -------------------------------------------------------------------------

    /// Create a new signing request and share it so all signers can interact.
    public entry fun create_request(
        title: String,
        blob_id: String,
        document_hash: String,
        signers: vector<address>,
        message: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let creator = ctx.sender();
        let created_at = clock.timestamp_ms();
        let signer_count = signers.length();

        let request = SigningRequest {
            id: object::new(ctx),
            title,
            blob_id,
            document_hash,
            creator,
            required_signers: signers,
            signed_by: vector::empty(),
            created_at,
            completed: false,
            revoked: false,
            message,
        };

        let request_id = object::uid_to_address(&request.id);

        event::emit(RequestCreated {
            request_id,
            creator,
            blob_id: request.blob_id,
            document_hash: request.document_hash,
            title: request.title,
            signer_count,
            created_at,
        });

        // Share the object so all signers can access it without transfers
        transfer::share_object(request);
    }

    /// Sign a document. Caller must be in required_signers and not have signed yet.
    public entry fun sign(
        request: &mut SigningRequest,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(!request.revoked, EAlreadyCompleted);
        assert!(!request.completed, EAlreadyCompleted);

        let signer = ctx.sender();

        // Check signer is authorized
        assert!(request.required_signers.contains(&signer), ENotAuthorized);

        // Check not already signed
        assert!(!request.signed_by.contains(&signer), EAlreadySigned);

        request.signed_by.push_back(signer);

        let total_signed = request.signed_by.length();
        let total_required = request.required_signers.length();
        let now = clock.timestamp_ms();

        if (total_signed == total_required) {
            request.completed = true;
        };

        event::emit(DocumentSigned {
            request_id: object::uid_to_address(&request.id),
            signer,
            signed_at: now,
            total_signed,
            total_required,
            completed: request.completed,
        });
    }

    /// Revoke a signing request before it is completed. Only creator can revoke.
    public entry fun revoke(
        request: &mut SigningRequest,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(ctx.sender() == request.creator, ENotCreator);
        assert!(!request.completed, ECannotRevokeCompleted);
        request.revoked = true;

        event::emit(RequestRevoked {
            request_id: object::uid_to_address(&request.id),
            creator: request.creator,
            revoked_at: clock.timestamp_ms(),
        });
    }

    // -------------------------------------------------------------------------
    // View helpers (pure reads, no state change)
    // -------------------------------------------------------------------------

    public fun is_completed(request: &SigningRequest): bool {
        request.completed
    }

    public fun is_revoked(request: &SigningRequest): bool {
        request.revoked
    }

    public fun has_signed(request: &SigningRequest, addr: address): bool {
        request.signed_by.contains(&addr)
    }

    public fun is_required_signer(request: &SigningRequest, addr: address): bool {
        request.required_signers.contains(&addr)
    }

    public fun signed_count(request: &SigningRequest): u64 {
        request.signed_by.length()
    }

    public fun required_count(request: &SigningRequest): u64 {
        request.required_signers.length()
    }

    public fun get_blob_id(request: &SigningRequest): &String {
        &request.blob_id
    }

    public fun get_document_hash(request: &SigningRequest): &String {
        &request.document_hash
    }

    public fun get_creator(request: &SigningRequest): address {
        request.creator
    }
}
