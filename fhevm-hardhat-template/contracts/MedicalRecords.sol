// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint32, ebool, externalEuint8, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title MedicalRecords - Contract for storing encrypted medical data with public statistics
/// @notice Allows foundations to register and manage medical records with statistical analysis
contract MedicalRecords is SepoliaConfig {
    
    struct Patient {
        string name;                    // Public name (non-sensitive)
        euint32 patientId;             // Encrypted ID
        uint256 diseaseCount;          // Number of diseases
        address foundation;            // Foundation that registered the patient
        uint256 timestamp;             // Registration timestamp
        bool exists;                   // Flag to verify existence
    }
    
    // Mapping from patient address to patient data
    mapping(address => Patient) private patientRecords;
    
    // Mapping from patient to disease index to encrypted disease data
    mapping(address => mapping(uint256 => euint8[])) private patientDiseases;
    mapping(address => mapping(uint256 => uint256)) private patientDiseaseLengths;
    
    // Authorization mapping for foundations and doctors to access specific patients
    mapping(address => mapping(address => bool)) public authorizedAccess;
    
    // Array of registered patient addresses
    address[] public registeredPatients;
    
    // Mapping of authorized foundations
    mapping(address => bool) public authorizedFoundations;
    
    // Contract owner (can authorize foundations)
    address public owner;
    
    // Statistical tracking
    uint256 public totalRegistrations;
    mapping(string => uint256) public diseaseOccurrences; // Public disease statistics
    mapping(address => uint256) public foundationPatientCounts;
    
    // Events
    event PatientRegistered(address indexed patient, address indexed foundation, string name);
    event DiseaseAdded(address indexed patient, address indexed addedBy, uint256 diseaseIndex);
    event AccessGranted(address indexed patient, address indexed authorizedEntity);
    event AccessRevoked(address indexed patient, address indexed revokedEntity);
    event FoundationAuthorized(address indexed foundation);
    event FoundationRevoked(address indexed foundation);
    event StatisticsUpdated(string diseaseType, uint256 newCount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAuthorizedFoundation() {
        require(authorizedFoundations[msg.sender], "Not an authorized foundation");
        _;
    }
    
    modifier onlyPatientOrAuthorized(address patient) {
        require(
            msg.sender == patient || 
            authorizedAccess[patient][msg.sender] ||
            (patientRecords[patient].exists && patientRecords[patient].foundation == msg.sender),
            "Not authorized to access this patient's data"
        );
        _;
    }
    
    modifier patientMustExist(address patient) {
        require(patientRecords[patient].exists, "Patient does not exist");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedFoundations[msg.sender] = true; // Owner is automatically authorized foundation
    }
    
    /// @notice Authorize a foundation to register patients
    /// @param foundation Foundation address
    function authorizeFoundation(address foundation) external onlyOwner {
        require(foundation != address(0), "Invalid foundation address");
        authorizedFoundations[foundation] = true;
        emit FoundationAuthorized(foundation);
    }
    
    /// @notice Revoke foundation authorization
    /// @param foundation Foundation address
    function revokeFoundation(address foundation) external onlyOwner {
        authorizedFoundations[foundation] = false;
        emit FoundationRevoked(foundation);
    }
    
    /// @notice Register a new patient (only authorized foundations)
    /// @param patient Patient address to register
    /// @param name Patient name (public, non-sensitive)
    /// @param patientIdExternal Encrypted patient ID
    /// @param inputProof Cryptographic proof to validate inputs
    function registerPatient(
        address patient,
        string calldata name,
        externalEuint32 patientIdExternal,
        bytes calldata inputProof
    ) external onlyAuthorizedFoundation {
        require(patient != address(0), "Invalid patient address");
        require(!patientRecords[patient].exists, "Patient already registered");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        // Validate and convert encrypted ID
        euint32 encryptedId = FHE.fromExternal(patientIdExternal, inputProof);
        
        // Create patient record
        patientRecords[patient].name = name;
        patientRecords[patient].patientId = encryptedId;
        patientRecords[patient].diseaseCount = 0;
        patientRecords[patient].foundation = msg.sender;
        patientRecords[patient].timestamp = block.timestamp;
        patientRecords[patient].exists = true;
        
        // Add to registered patients list
        registeredPatients.push(patient);
        
        // Update statistics
        totalRegistrations++;
        foundationPatientCounts[msg.sender]++;
        
        // Configure FHE permissions for ID
        FHE.allowThis(encryptedId);
        FHE.allow(encryptedId, patient);
        FHE.allow(encryptedId, msg.sender);
        
        emit PatientRegistered(patient, msg.sender, name);
    }
    
    /// @notice Add a disease to patient record
    /// @param patient Patient address
    /// @param diseaseData Array of encrypted disease bytes
    /// @param diseaseLength Actual length of disease name
    /// @param inputProof Cryptographic proof
    function addDisease(
        address patient,
        externalEuint8[] calldata diseaseData,
        uint256 diseaseLength,
        bytes calldata inputProof
    ) external onlyPatientOrAuthorized(patient) patientMustExist(patient) {
        require(diseaseData.length > 0 && diseaseLength <= diseaseData.length, "Invalid disease data");
        
        uint256 diseaseIndex = patientRecords[patient].diseaseCount;
        
        // Convert encrypted disease and store
        euint8[] storage diseaseStorage = patientDiseases[patient][diseaseIndex];
        
        for (uint256 i = 0; i < diseaseData.length; i++) {
            euint8 encryptedByte = FHE.fromExternal(diseaseData[i], inputProof);
            diseaseStorage.push(encryptedByte);
            FHE.allowThis(encryptedByte);
            FHE.allow(encryptedByte, patient);
            if (msg.sender != patient) {
                FHE.allow(encryptedByte, msg.sender);
            }
        }
        
        // Store length and update counter
        patientDiseaseLengths[patient][diseaseIndex] = diseaseLength;
        patientRecords[patient].diseaseCount++;
        
        emit DiseaseAdded(patient, msg.sender, diseaseIndex);
    }
    
    /// @notice Get patient name (public)
    /// @param patient Patient address
    /// @return Patient name
    function getPatientName(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (string memory) 
    {
        return patientRecords[patient].name;
    }
    
    /// @notice Get encrypted patient ID
    /// @param patient Patient address
    /// @return Encrypted ID
    function getPatientId(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (euint32) 
    {
        return patientRecords[patient].patientId;
    }
    
    /// @notice Get specific patient disease (encrypted)
    /// @param patient Patient address
    /// @param diseaseIndex Disease index
    /// @return data Array of encrypted disease bytes
    /// @return length Actual length of disease name
    function getPatientDisease(address patient, uint256 diseaseIndex) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (euint8[] memory data, uint256 length) 
    {
        require(diseaseIndex < patientRecords[patient].diseaseCount, "Disease index out of bounds");
        return (patientDiseases[patient][diseaseIndex], patientDiseaseLengths[patient][diseaseIndex]);
    }
    
    /// @notice Get patient disease count
    /// @param patient Patient address
    /// @return Number of diseases registered
    function getPatientDiseaseCount(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (uint256) 
    {
        return patientRecords[patient].diseaseCount;
    }
    
    /// @notice Get basic patient information (non-encrypted)
    /// @param patient Patient address
    /// @return name Patient name
    /// @return foundation Foundation that registered the patient
    /// @return timestamp Registration timestamp
    /// @return diseaseCount Number of diseases registered
    function getPatientInfo(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (string memory name, address foundation, uint256 timestamp, uint256 diseaseCount) 
    {
        Patient storage record = patientRecords[patient];
        return (record.name, record.foundation, record.timestamp, record.diseaseCount);
    }
    
    /// @notice Patient grants access to a doctor or foundation
    /// @param authorizedEntity Doctor or foundation address
    function grantAccess(address authorizedEntity) external {
        require(patientRecords[msg.sender].exists, "Patient not registered");
        require(authorizedEntity != address(0), "Invalid authorized entity address");
        
        authorizedAccess[msg.sender][authorizedEntity] = true;
        
        // Grant FHE permissions for encrypted data only (ID and diseases)
        Patient storage record = patientRecords[msg.sender];
        
        // Permissions for ID
        FHE.allow(record.patientId, authorizedEntity);
        
        // Permissions for diseases
        for (uint256 j = 0; j < record.diseaseCount; j++) {
            euint8[] storage diseaseData = patientDiseases[msg.sender][j];
            for (uint256 k = 0; k < diseaseData.length; k++) {
                FHE.allow(diseaseData[k], authorizedEntity);
            }
        }
        
        emit AccessGranted(msg.sender, authorizedEntity);
    }
    
    /// @notice Patient revokes access
    /// @param authorizedEntity Address to revoke
    function revokeAccess(address authorizedEntity) external {
        require(patientRecords[msg.sender].exists, "Patient not registered");
        
        authorizedAccess[msg.sender][authorizedEntity] = false;
        
        emit AccessRevoked(msg.sender, authorizedEntity);
    }
    
    // ========================= PUBLIC STATISTICS FUNCTIONS =========================
    
    /// @notice Get total number of registered patients
    /// @return Number of patients
    function getTotalPatients() external view returns (uint256) {
        return registeredPatients.length;
    }
    
    /// @notice Get total registrations count
    /// @return Total registrations
    function getTotalRegistrations() external view returns (uint256) {
        return totalRegistrations;
    }
    
    /// @notice Get number of patients registered by a specific foundation
    /// @param foundation Foundation address
    /// @return Number of patients registered by this foundation
    function getFoundationPatientCount(address foundation) external view returns (uint256) {
        return foundationPatientCounts[foundation];
    }
    
    /// @notice Get all patient names (for statistical purposes only)
    /// @return Array of patient names
    function getAllPatientNames() external view returns (string[] memory) {
        string[] memory names = new string[](registeredPatients.length);
        for (uint256 i = 0; i < registeredPatients.length; i++) {
            names[i] = patientRecords[registeredPatients[i]].name;
        }
        return names;
    }
    
    /// @notice Get patients registered by a specific foundation
    /// @param foundation Foundation address
    /// @return Array of patient addresses registered by this foundation
    function getPatientsByFoundation(address foundation) external view returns (address[] memory) {
        // First, count patients from this foundation
        uint256 count = 0;
        for (uint256 i = 0; i < registeredPatients.length; i++) {
            if (patientRecords[registeredPatients[i]].foundation == foundation) {
                count++;
            }
        }
        
        // Create array with exact size
        address[] memory foundationPatients = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < registeredPatients.length; i++) {
            if (patientRecords[registeredPatients[i]].foundation == foundation) {
                foundationPatients[index] = registeredPatients[i];
                index++;
            }
        }
        
        return foundationPatients;
    }
    
    /// @notice Get statistical summary of the system
    /// @return totalPatients Total number of patients
    /// @return totalDiseases Total number of diseases across all patients
    /// @return avgDiseasesPerPatient Average diseases per patient (scaled by 100)
    function getSystemStatistics() external view returns (
        uint256 totalPatients,
        uint256 totalDiseases,
        uint256 avgDiseasesPerPatient
    ) {
        totalPatients = registeredPatients.length;
        
        if (totalPatients == 0) {
            return (0, 0, 0);
        }
        
        uint256 totalDiseaseCount = 0;
        for (uint256 i = 0; i < registeredPatients.length; i++) {
            totalDiseaseCount += patientRecords[registeredPatients[i]].diseaseCount;
        }
        
        totalDiseases = totalDiseaseCount;
        avgDiseasesPerPatient = (totalDiseaseCount * 100) / totalPatients; // Scaled by 100 for precision
    }
    
    /// @notice Get registration timeline (patients registered in time ranges)
    /// @param timeRangeSeconds Time range in seconds (e.g., 86400 for daily)
    /// @return Array of registration counts per time period
    function getRegistrationTimeline(uint256 timeRangeSeconds) external view returns (uint256[] memory) {
        if (registeredPatients.length == 0) {
            return new uint256[](0);
        }
        
        // Find earliest and latest registration
        uint256 earliestTime = patientRecords[registeredPatients[0]].timestamp;
        uint256 latestTime = block.timestamp;
        
        for (uint256 i = 1; i < registeredPatients.length; i++) {
            uint256 regTime = patientRecords[registeredPatients[i]].timestamp;
            if (regTime < earliestTime) {
                earliestTime = regTime;
            }
        }
        
        // Calculate number of periods
        uint256 totalTime = latestTime - earliestTime;
        uint256 periods = (totalTime / timeRangeSeconds) + 1;
        
        // Count registrations per period
        uint256[] memory timeline = new uint256[](periods);
        
        for (uint256 i = 0; i < registeredPatients.length; i++) {
            uint256 regTime = patientRecords[registeredPatients[i]].timestamp;
            uint256 periodIndex = (regTime - earliestTime) / timeRangeSeconds;
            if (periodIndex < periods) {
                timeline[periodIndex]++;
            }
        }
        
        return timeline;
    }
    
    /// @notice Check if patient is registered
    /// @param patient Patient address
    /// @return true if exists
    function isPatientRegistered(address patient) external view returns (bool) {
        return patientRecords[patient].exists;
    }
    
    /// @notice Check if foundation is authorized
    /// @param foundation Foundation address
    /// @return true if authorized
    function isFoundationAuthorized(address foundation) external view returns (bool) {
        return authorizedFoundations[foundation];
    }
    
    /// @notice Get patient registration info for statistics (public names only)
    /// @param startIndex Starting index in registeredPatients array
    /// @param count Number of patients to return
    /// @return names Array of patient names
    /// @return timestamps Array of registration timestamps
    /// @return foundations Array of foundation addresses
    /// @return diseaseCounts Array of disease counts per patient
    function getPatientRegistrationBatch(uint256 startIndex, uint256 count) 
        external 
        view 
        returns (
            string[] memory names,
            uint256[] memory timestamps,
            address[] memory foundations,
            uint256[] memory diseaseCounts
        ) 
    {
        require(startIndex < registeredPatients.length, "Start index out of bounds");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > registeredPatients.length) {
            endIndex = registeredPatients.length;
        }
        
        uint256 actualCount = endIndex - startIndex;
        
        names = new string[](actualCount);
        timestamps = new uint256[](actualCount);
        foundations = new address[](actualCount);
        diseaseCounts = new uint256[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            address patientAddr = registeredPatients[startIndex + i];
            Patient storage patient = patientRecords[patientAddr];
            
            names[i] = patient.name;
            timestamps[i] = patient.timestamp;
            foundations[i] = patient.foundation;
            diseaseCounts[i] = patient.diseaseCount;
        }
    }
}