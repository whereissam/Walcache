// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WalrusBlobRegistry
 * @dev Smart contract for registering and managing Walrus blob metadata on Ethereum
 * @notice This contract stores blob metadata and provides verification for WCDN
 */
contract WalrusBlobRegistry is Ownable, ReentrancyGuard {
    
    struct BlobMetadata {
        string blobId;           // Walrus blob ID
        address uploader;        // Address that uploaded the blob
        uint256 size;           // File size in bytes
        string contentType;     // MIME type
        uint256 timestamp;      // Upload timestamp
        string cdnUrl;          // WCDN CDN URL
        bool isPinned;          // Whether blob is pinned in WCDN cache
        bytes32 contentHash;    // Hash of the content for verification
    }
    
    struct BatchUpload {
        string[] blobIds;
        uint256 totalSize;
        uint256 timestamp;
        address uploader;
    }
    
    // Mapping from blob ID to metadata
    mapping(string => BlobMetadata) public blobs;
    
    // Mapping from uploader to their blob IDs
    mapping(address => string[]) public uploaderBlobs;
    
    // Mapping for batch uploads
    mapping(bytes32 => BatchUpload) public batchUploads;
    
    // Events
    event BlobRegistered(
        string indexed blobId,
        address indexed uploader,
        uint256 size,
        string contentType,
        string cdnUrl
    );
    
    event BlobPinned(string indexed blobId, address indexed operator);
    event BlobUnpinned(string indexed blobId, address indexed operator);
    event BatchRegistered(bytes32 indexed batchId, address indexed uploader, uint256 count);
    
    // Modifiers
    modifier blobExists(string memory blobId) {
        require(bytes(blobs[blobId].blobId).length > 0, "Blob does not exist");
        _;
    }
    
    modifier onlyUploader(string memory blobId) {
        require(blobs[blobId].uploader == msg.sender, "Not the uploader");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register a new blob with metadata
     * @param blobId Walrus blob ID
     * @param size File size in bytes
     * @param contentType MIME type of the file
     * @param cdnUrl WCDN CDN URL for the blob
     * @param contentHash Hash of the file content
     */
    function registerBlob(
        string memory blobId,
        uint256 size,
        string memory contentType,
        string memory cdnUrl,
        bytes32 contentHash
    ) external nonReentrant {
        require(bytes(blobId).length > 0, "Invalid blob ID");
        require(bytes(blobs[blobId].blobId).length == 0, "Blob already registered");
        require(size > 0, "Invalid size");
        
        BlobMetadata memory metadata = BlobMetadata({
            blobId: blobId,
            uploader: msg.sender,
            size: size,
            contentType: contentType,
            timestamp: block.timestamp,
            cdnUrl: cdnUrl,
            isPinned: false,
            contentHash: contentHash
        });
        
        blobs[blobId] = metadata;
        uploaderBlobs[msg.sender].push(blobId);
        
        emit BlobRegistered(blobId, msg.sender, size, contentType, cdnUrl);
    }
    
    /**
     * @dev Register multiple blobs in a single transaction (gas optimization)
     * @param blobIds Array of Walrus blob IDs
     * @param sizes Array of file sizes
     * @param contentTypes Array of MIME types
     * @param cdnUrls Array of WCDN CDN URLs
     * @param contentHashes Array of content hashes
     */
    function registerBlobBatch(
        string[] memory blobIds,
        uint256[] memory sizes,
        string[] memory contentTypes,
        string[] memory cdnUrls,
        bytes32[] memory contentHashes
    ) external nonReentrant {
        require(blobIds.length > 0, "Empty batch");
        require(
            blobIds.length == sizes.length &&
            blobIds.length == contentTypes.length &&
            blobIds.length == cdnUrls.length &&
            blobIds.length == contentHashes.length,
            "Array length mismatch"
        );
        
        uint256 totalSize = 0;
        bytes32 batchId = keccak256(abi.encodePacked(msg.sender, block.timestamp, blobIds.length));
        
        for (uint256 i = 0; i < blobIds.length; i++) {
            require(bytes(blobIds[i]).length > 0, "Invalid blob ID");
            require(bytes(blobs[blobIds[i]].blobId).length == 0, "Blob already registered");
            require(sizes[i] > 0, "Invalid size");
            
            BlobMetadata memory metadata = BlobMetadata({
                blobId: blobIds[i],
                uploader: msg.sender,
                size: sizes[i],
                contentType: contentTypes[i],
                timestamp: block.timestamp,
                cdnUrl: cdnUrls[i],
                isPinned: false,
                contentHash: contentHashes[i]
            });
            
            blobs[blobIds[i]] = metadata;
            uploaderBlobs[msg.sender].push(blobIds[i]);
            totalSize += sizes[i];
            
            emit BlobRegistered(blobIds[i], msg.sender, sizes[i], contentTypes[i], cdnUrls[i]);
        }
        
        batchUploads[batchId] = BatchUpload({
            blobIds: blobIds,
            totalSize: totalSize,
            timestamp: block.timestamp,
            uploader: msg.sender
        });
        
        emit BatchRegistered(batchId, msg.sender, blobIds.length);
    }
    
    /**
     * @dev Pin a blob to prevent cache eviction
     * @param blobId Walrus blob ID to pin
     */
    function pinBlob(string memory blobId) external blobExists(blobId) onlyUploader(blobId) {
        require(!blobs[blobId].isPinned, "Blob already pinned");
        blobs[blobId].isPinned = true;
        emit BlobPinned(blobId, msg.sender);
    }
    
    /**
     * @dev Unpin a blob to allow cache eviction
     * @param blobId Walrus blob ID to unpin
     */
    function unpinBlob(string memory blobId) external blobExists(blobId) onlyUploader(blobId) {
        require(blobs[blobId].isPinned, "Blob not pinned");
        blobs[blobId].isPinned = false;
        emit BlobUnpinned(blobId, msg.sender);
    }
    
    /**
     * @dev Get blob metadata
     * @param blobId Walrus blob ID
     * @return BlobMetadata struct
     */
    function getBlobMetadata(string memory blobId) external view returns (BlobMetadata memory) {
        require(bytes(blobs[blobId].blobId).length > 0, "Blob does not exist");
        return blobs[blobId];
    }
    
    /**
     * @dev Get all blob IDs uploaded by an address
     * @param uploader Address to query
     * @return Array of blob IDs
     */
    function getUploaderBlobs(address uploader) external view returns (string[] memory) {
        return uploaderBlobs[uploader];
    }
    
    /**
     * @dev Verify blob content hash
     * @param blobId Walrus blob ID
     * @param providedHash Hash to verify against
     * @return bool indicating if hash matches
     */
    function verifyBlobHash(string memory blobId, bytes32 providedHash) external view returns (bool) {
        return blobs[blobId].contentHash == providedHash;
    }
    
    /**
     * @dev Get blob count for an uploader
     * @param uploader Address to query
     * @return Number of blobs uploaded
     */
    function getBlobCount(address uploader) external view returns (uint256) {
        return uploaderBlobs[uploader].length;
    }
    
    /**
     * @dev Check if blob is registered and get basic info
     * @param blobId Walrus blob ID
     * @return exists Whether blob exists
     * @return uploader Address of uploader
     * @return isPinned Whether blob is pinned
     */
    function getBlobStatus(string memory blobId) external view returns (bool exists, address uploader, bool isPinned) {
        if (bytes(blobs[blobId].blobId).length > 0) {
            return (true, blobs[blobId].uploader, blobs[blobId].isPinned);
        }
        return (false, address(0), false);
    }
}