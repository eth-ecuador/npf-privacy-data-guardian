// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint32, ebool, externalEuint8, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";


/// @title MedicalRecords - Contrato para almacenar datos médicos encriptados
/// @notice Permite a fundaciones registrar y gestionar registros médicos de personas vulnerables
contract MedicalRecords is SepoliaConfig {
    
    struct EncryptedPatient {
        euint8[] nameData;              // Array de bytes encriptados del nombre
        uint256 nameLength;             // Longitud real del nombre
        euint32 patientId;              // ID encriptado
        uint256 diseaseCount;           // Contador de enfermedades
        address foundation;             // Fundación que registró al paciente
        uint256 timestamp;              // Timestamp del registro
        bool exists;                    // Flag para verificar existencia
    }
    
    // Mapping de address del paciente -> datos encriptados
    mapping(address => EncryptedPatient) private patientRecords;
    
    // Mapping de paciente -> índice de enfermedad -> datos de enfermedad
    mapping(address => mapping(uint256 => euint8[])) private patientDiseases;
    mapping(address => mapping(uint256 => uint256)) private patientDiseaseLengths;
    
    // Mapping para autorizar acceso de fundaciones y médicos a pacientes específicos
    mapping(address => mapping(address => bool)) public authorizedAccess;
    
    // Array de addresses de pacientes registrados
    address[] public registeredPatients;
    
    // Mapping de fundaciones autorizadas
    mapping(address => bool) public authorizedFoundations;
    
    // Owner del contrato (puede autorizar fundaciones)
    address public owner;
    
    // Events
    event PatientRegistered(address indexed patient, address indexed foundation);
    event DiseaseAdded(address indexed patient, address indexed addedBy, uint256 diseaseIndex);
    event AccessGranted(address indexed patient, address indexed authorizedEntity);
    event AccessRevoked(address indexed patient, address indexed revokedEntity);
    event FoundationAuthorized(address indexed foundation);
    event FoundationRevoked(address indexed foundation);
    
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
    
    /// @notice Autorizar una fundación para registrar pacientes
    /// @param foundation Dirección de la fundación
    function authorizeFoundation(address foundation) external onlyOwner {
        require(foundation != address(0), "Invalid foundation address");
        authorizedFoundations[foundation] = true;
        emit FoundationAuthorized(foundation);
    }
    
    /// @notice Revocar autorización de una fundación
    /// @param foundation Dirección de la fundación
    function revokeFoundation(address foundation) external onlyOwner {
        authorizedFoundations[foundation] = false;
        emit FoundationRevoked(foundation);
    }
    
    /// @notice Registrar un nuevo paciente (solo fundaciones autorizadas)
    /// @param patient Dirección del paciente a registrar
    /// @param nameData Array de bytes encriptados del nombre
    /// @param nameLength Longitud real del nombre
    /// @param patientIdExternal ID encriptado del paciente
    /// @param inputProof Prueba criptográfica para validar inputs
    function registerPatient(
        address patient,
        externalEuint8[] calldata nameData,
        uint256 nameLength,
        externalEuint32 patientIdExternal,
        bytes calldata inputProof
    ) external onlyAuthorizedFoundation {
        require(patient != address(0), "Invalid patient address");
        require(!patientRecords[patient].exists, "Patient already registered");
        require(nameData.length > 0 && nameLength <= nameData.length, "Invalid name data");
        
        // Validar y convertir ID encriptado
        euint32 encryptedId = FHE.fromExternal(patientIdExternal, inputProof);
        
        // Convertir nombre encriptado
        euint8[] storage nameStorage = patientRecords[patient].nameData;
        
        for (uint256 i = 0; i < nameData.length; i++) {
            euint8 encryptedByte = FHE.fromExternal(nameData[i], inputProof);
            nameStorage.push(encryptedByte);
            FHE.allowThis(encryptedByte);
            FHE.allow(encryptedByte, patient);
            FHE.allow(encryptedByte, msg.sender); // Foundation access
        }
        
        // Crear registro de paciente
        patientRecords[patient].nameLength = nameLength;
        patientRecords[patient].patientId = encryptedId;
        patientRecords[patient].diseaseCount = 0;
        patientRecords[patient].foundation = msg.sender;
        patientRecords[patient].timestamp = block.timestamp;
        patientRecords[patient].exists = true;
        
        // Añadir a lista de pacientes registrados
        registeredPatients.push(patient);
        
        // Configurar permisos FHE para ID
        FHE.allowThis(encryptedId);
        FHE.allow(encryptedId, patient);
        FHE.allow(encryptedId, msg.sender);
        
        emit PatientRegistered(patient, msg.sender);
    }
    
    /// @notice Añadir una enfermedad al registro de un paciente
    /// @param patient Dirección del paciente
    /// @param diseaseData Array de bytes encriptados de la enfermedad
    /// @param diseaseLength Longitud real del nombre de la enfermedad
    /// @param inputProof Prueba criptográfica
    function addDisease(
        address patient,
        externalEuint8[] calldata diseaseData,
        uint256 diseaseLength,
        bytes calldata inputProof
    ) external onlyPatientOrAuthorized(patient) patientMustExist(patient) {
        require(diseaseData.length > 0 && diseaseLength <= diseaseData.length, "Invalid disease data");
        
        uint256 diseaseIndex = patientRecords[patient].diseaseCount;
        
        // Convertir enfermedad encriptada y almacenar
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
        
        // Almacenar longitud y actualizar contador
        patientDiseaseLengths[patient][diseaseIndex] = diseaseLength;
        patientRecords[patient].diseaseCount++;
        
        emit DiseaseAdded(patient, msg.sender, diseaseIndex);
    }
    
    /// @notice Obtener nombre encriptado del paciente
    /// @param patient Dirección del paciente
    /// @return data Array de bytes encriptados del nombre
    /// @return length Longitud real del nombre
    function getPatientName(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (euint8[] memory data, uint256 length) 
    {
        EncryptedPatient storage record = patientRecords[patient];
        return (record.nameData, record.nameLength);
    }
    
    /// @notice Obtener ID encriptado del paciente
    /// @param patient Dirección del paciente
    /// @return ID encriptado
    function getPatientId(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (euint32) 
    {
        return patientRecords[patient].patientId;
    }
    
    /// @notice Obtener una enfermedad específica del paciente
    /// @param patient Dirección del paciente
    /// @param diseaseIndex Índice de la enfermedad
    /// @return data Array de bytes encriptados de la enfermedad
    /// @return length Longitud real del nombre de la enfermedad
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
    
    /// @notice Obtener número de enfermedades del paciente
    /// @param patient Dirección del paciente
    /// @return Número de enfermedades registradas
    function getPatientDiseaseCount(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (uint256) 
    {
        return patientRecords[patient].diseaseCount;
    }
    
    /// @notice Obtener información básica del registro (no encriptada)
    /// @param patient Dirección del paciente
    /// @return foundation Fundación que registró al paciente
    /// @return timestamp Timestamp de cuando se registró
    /// @return diseaseCount Número de enfermedades registradas
    function getPatientInfo(address patient) 
        external 
        view 
        onlyPatientOrAuthorized(patient) 
        patientMustExist(patient) 
        returns (address foundation, uint256 timestamp, uint256 diseaseCount) 
    {
        EncryptedPatient storage record = patientRecords[patient];
        return (record.foundation, record.timestamp, record.diseaseCount);
    }
    
    /// @notice Paciente otorga acceso a un médico o fundación
    /// @param authorizedEntity Dirección del médico o fundación
    function grantAccess(address authorizedEntity) external {
        require(patientRecords[msg.sender].exists, "Patient not registered");
        require(authorizedEntity != address(0), "Invalid authorized entity address");
        
        authorizedAccess[msg.sender][authorizedEntity] = true;
        
        // Otorgar permisos FHE
        EncryptedPatient storage record = patientRecords[msg.sender];
        
        // Permisos para nombre
        for (uint256 i = 0; i < record.nameData.length; i++) {
            FHE.allow(record.nameData[i], authorizedEntity);
        }
        
        // Permisos para ID
        FHE.allow(record.patientId, authorizedEntity);
        
        // Permisos para enfermedades
        for (uint256 j = 0; j < record.diseaseCount; j++) {
            euint8[] storage diseaseData = patientDiseases[msg.sender][j];
            for (uint256 k = 0; k < diseaseData.length; k++) {
                FHE.allow(diseaseData[k], authorizedEntity);
            }
        }
        
        emit AccessGranted(msg.sender, authorizedEntity);
    }
    
    /// @notice Paciente revoca acceso
    /// @param authorizedEntity Dirección a revocar
    function revokeAccess(address authorizedEntity) external {
        require(patientRecords[msg.sender].exists, "Patient not registered");
        
        authorizedAccess[msg.sender][authorizedEntity] = false;
        
        emit AccessRevoked(msg.sender, authorizedEntity);
    }
    
    /// @notice Obtener número total de pacientes registrados
    /// @return Número de pacientes
    function getTotalPatients() external view returns (uint256) {
        return registeredPatients.length;
    }
    
    /// @notice Verificar si un paciente existe
    /// @param patient Dirección del paciente
    /// @return true si existe
    function isPatientRegistered(address patient) external view returns (bool) {
        return patientRecords[patient].exists;
    }
    
    /// @notice Verificar si una fundación está autorizada
    /// @param foundation Dirección de la fundación
    /// @return true si está autorizada
    function isFoundationAuthorized(address foundation) external view returns (bool) {
        return authorizedFoundations[foundation];
    }
}