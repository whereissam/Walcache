// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/WalrusBlobRegistry.sol";

contract WalrusBlobRegistryTest is Test {
    WalrusBlobRegistry public registry;
    address public owner;
    address public user1;
    address public user2;
    
    string constant BLOB_ID = "test_blob_123";
    string constant CONTENT_TYPE = "image/jpeg";
    string constant CDN_URL = "https://cdn.wcdn.dev/test_blob_123";
    bytes32 constant CONTENT_HASH = keccak256("test content");
    uint256 constant FILE_SIZE = 1024;
    
    event BlobRegistered(
        string indexed blobId,
        address indexed uploader,
        uint256 size,
        string contentType,
        string cdnUrl
    );
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        registry = new WalrusBlobRegistry();
    }
    
    function testRegisterBlob() public {
        vm.prank(user1);
        
        vm.expectEmit(true, true, false, true);
        emit BlobRegistered(BLOB_ID, user1, FILE_SIZE, CONTENT_TYPE, CDN_URL);
        
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        WalrusBlobRegistry.BlobMetadata memory metadata = registry.getBlobMetadata(BLOB_ID);
        assertEq(metadata.blobId, BLOB_ID);
        assertEq(metadata.uploader, user1);
        assertEq(metadata.size, FILE_SIZE);
        assertEq(metadata.contentType, CONTENT_TYPE);
        assertEq(metadata.cdnUrl, CDN_URL);
        assertEq(metadata.contentHash, CONTENT_HASH);
        assertFalse(metadata.isPinned);
    }
    
    function testRegisterBlobBatch() public {
        string[] memory blobIds = new string[](3);
        uint256[] memory sizes = new uint256[](3);
        string[] memory contentTypes = new string[](3);
        string[] memory cdnUrls = new string[](3);
        bytes32[] memory contentHashes = new bytes32[](3);
        
        for (uint256 i = 0; i < 3; i++) {
            blobIds[i] = string(abi.encodePacked("blob_", i));
            sizes[i] = 1000 + i;
            contentTypes[i] = "image/jpeg";
            cdnUrls[i] = string(abi.encodePacked("https://cdn.wcdn.dev/blob_", i));
            contentHashes[i] = keccak256(abi.encodePacked("content_", i));
        }
        
        vm.prank(user1);
        registry.registerBlobBatch(blobIds, sizes, contentTypes, cdnUrls, contentHashes);
        
        // Verify all blobs were registered
        for (uint256 i = 0; i < 3; i++) {
            WalrusBlobRegistry.BlobMetadata memory metadata = registry.getBlobMetadata(blobIds[i]);
            assertEq(metadata.uploader, user1);
            assertEq(metadata.size, sizes[i]);
        }
        
        // Check uploader blob count
        assertEq(registry.getBlobCount(user1), 3);
    }
    
    function testPinBlob() public {
        vm.prank(user1);
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        vm.prank(user1);
        registry.pinBlob(BLOB_ID);
        
        WalrusBlobRegistry.BlobMetadata memory metadata = registry.getBlobMetadata(BLOB_ID);
        assertTrue(metadata.isPinned);
    }
    
    function testUnpinBlob() public {
        vm.prank(user1);
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        vm.prank(user1);
        registry.pinBlob(BLOB_ID);
        
        vm.prank(user1);
        registry.unpinBlob(BLOB_ID);
        
        WalrusBlobRegistry.BlobMetadata memory metadata = registry.getBlobMetadata(BLOB_ID);
        assertFalse(metadata.isPinned);
    }
    
    function testVerifyBlobHash() public {
        vm.prank(user1);
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        assertTrue(registry.verifyBlobHash(BLOB_ID, CONTENT_HASH));
        assertFalse(registry.verifyBlobHash(BLOB_ID, keccak256("wrong content")));
    }
    
    function testGetBlobStatus() public {
        // Test non-existent blob
        (bool exists, address uploader, bool isPinned) = registry.getBlobStatus("non_existent");
        assertFalse(exists);
        assertEq(uploader, address(0));
        assertFalse(isPinned);
        
        // Register and test existing blob
        vm.prank(user1);
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        (exists, uploader, isPinned) = registry.getBlobStatus(BLOB_ID);
        assertTrue(exists);
        assertEq(uploader, user1);
        assertFalse(isPinned);
    }
    
    function testGetUploaderBlobs() public {
        vm.startPrank(user1);
        registry.registerBlob("blob1", 1000, "image/jpeg", "url1", keccak256("content1"));
        registry.registerBlob("blob2", 2000, "image/png", "url2", keccak256("content2"));
        vm.stopPrank();
        
        string[] memory userBlobs = registry.getUploaderBlobs(user1);
        assertEq(userBlobs.length, 2);
        assertEq(userBlobs[0], "blob1");
        assertEq(userBlobs[1], "blob2");
    }
    
    function testFailRegisterDuplicateBlob() public {
        vm.prank(user1);
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        vm.prank(user2);
        vm.expectRevert("Blob already registered");
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
    }
    
    function testFailPinBlobNotOwner() public {
        vm.prank(user1);
        registry.registerBlob(BLOB_ID, FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
        
        vm.prank(user2);
        vm.expectRevert("Not the uploader");
        registry.pinBlob(BLOB_ID);
    }
    
    function testFailRegisterInvalidBlob() public {
        vm.prank(user1);
        vm.expectRevert("Invalid blob ID");
        registry.registerBlob("", FILE_SIZE, CONTENT_TYPE, CDN_URL, CONTENT_HASH);
    }
}