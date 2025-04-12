
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertVault {
    struct Certificate {
        string recipientName;
        string courseName;
        string ipfsHash;
        uint256 issuedOn;
    }

    mapping(string => Certificate) public certificates;
    mapping(string => bool) public isValidIPFS;

    event CertificateIssued(string ipfsHash, string recipientName, string courseName, uint256 issuedOn);

    function issueCertificate(
        string memory _recipientName,
        string memory _courseName,
        string memory _ipfsHash
    ) external {
        certificates[_ipfsHash] = Certificate(_recipientName, _courseName, _ipfsHash, block.timestamp);
        isValidIPFS[_ipfsHash] = true;

        emit CertificateIssued(_ipfsHash, _recipientName, _courseName, block.timestamp);
    }

    function validateCertificate(string memory _ipfsHash) public view returns (bool) {
        return isValidIPFS[_ipfsHash];
    }

    function getCertificate(string memory _ipfsHash) public view returns (Certificate memory) {
        require(isValidIPFS[_ipfsHash], "Certificate does not exist");
        return certificates[_ipfsHash];
    }
}
