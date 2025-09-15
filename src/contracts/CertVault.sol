// MAIN BLOCKCHAIN FILE 
// WHEN IT'S DEPLOYED, THE FILE IS
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract CertVault {
    struct Certificate {
        string recipientName;
        string courseName;
        string ipfsHash;
        uint256 issuedOn;
        address issuer;
        uint256 revokedAt;
    }

    address public owner;
    mapping(address => bool) public isAdmin;

    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => bool) public isValidIPFS;

    event CertificateIssued(string ipfsHash, string recipientName, string courseName, uint256 issuedOn, address indexed issuer);
    event CertificateRevoked(string ipfsHash, uint256 revokedAt, address indexed revokedBy);
    event AdminAdded(address indexed account);
    event AdminRemoved(address indexed account);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        isAdmin[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }

    function addAdmin(address _account) external onlyOwner {
        require(_account != address(0), "Invalid address");
        require(!isAdmin[_account], "Already admin");
        isAdmin[_account] = true;
        emit AdminAdded(_account);
    }

    function removeAdmin(address _account) external onlyOwner {
        require(isAdmin[_account], "Not admin");
        isAdmin[_account] = false;
        emit AdminRemoved(_account);
    }

    function issueCertificate(
        string memory _recipientName,
        string memory _courseName,
        string memory _ipfsHash
    ) external onlyAdmin {
        require(bytes(_recipientName).length > 0, "Invalid recipient");
        require(bytes(_courseName).length > 0, "Invalid course");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        bytes32 key = keccak256(abi.encodePacked(_ipfsHash));
        require(!isValidIPFS[key], "Already issued");

        certificates[key] = Certificate({
            recipientName: _recipientName,
            courseName: _courseName,
            ipfsHash: _ipfsHash,
            issuedOn: block.timestamp,
            issuer: msg.sender,
            revokedAt: 0
        });
        isValidIPFS[key] = true;

        emit CertificateIssued(_ipfsHash, _recipientName, _courseName, block.timestamp, msg.sender);
    }

    function revokeCertificate(string memory _ipfsHash) external {
        bytes32 key = keccak256(abi.encodePacked(_ipfsHash));
        require(isValidIPFS[key], "Not issued or already revoked");
        Certificate storage cert = certificates[key];
        require(msg.sender == cert.issuer || isAdmin[msg.sender], "Not issuer/admin");

        isValidIPFS[key] = false;
        cert.revokedAt = block.timestamp;

        emit CertificateRevoked(_ipfsHash, cert.revokedAt, msg.sender);
    }

    function validateCertificate(string memory _ipfsHash) public view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(_ipfsHash));
        return isValidIPFS[key];
    }

    function getCertificate(string memory _ipfsHash) public view returns (Certificate memory) {
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        bytes32 key = keccak256(abi.encodePacked(_ipfsHash));
        require(certificates[key].issuedOn != 0, "Certificate does not exist");
        return certificates[key];
    }
}
