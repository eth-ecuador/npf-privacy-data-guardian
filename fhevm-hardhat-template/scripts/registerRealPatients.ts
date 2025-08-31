// scripts/registerRealPatients.ts
import { ethers, fhevm } from "hardhat";
import hre from "hardhat";

const CONTRACT_ADDRESS = "0x9467A74FA655590739e5c5b617D10c35f2F1a7c4";

// Real patient addresses
const REAL_PATIENTS = [
  {
    address: "0x9C32fA6d2f006D075b06Fa2892283bCD0B9633ee",
    name: "Maria Rodriguez",
    id: 40001,
    diseases: ["Diabetes Tipo 2", "Hipertensión Arterial"]
  },
  {
    address: "0x9d01e1c344333a517ea3BddadB690d1a2E2121C4", 
    name: "Carlos Mendoza",
    id: 40002,
    diseases: ["Asma", "Gastritis"]
  }
];

async function main() {
  console.log("Registering real patients to existing contract...");
  console.log("Contract address:", CONTRACT_ADDRESS);
  console.log("Network:", hre.network.name);

  const signers = await ethers.getSigners();
  const foundation = signers[0]; // Foundation/deployer account
  
  console.log("Foundation address:", foundation.address);

  const balance = await foundation.provider.getBalance(foundation.address);
  console.log("Foundation balance:", ethers.formatEther(balance), "ETH");

  // Connect to existing contract
  const medicalRecords = await ethers.getContractAt("MedicalRecords", CONTRACT_ADDRESS);
  
  // Verify foundation authorization
  const isAuthorized = await medicalRecords.isFoundationAuthorized(foundation.address);
  console.log("Foundation authorized:", isAuthorized);

  if (!isAuthorized) {
    console.log("ERROR: Foundation is not authorized!");
    return;
  }

  // Initialize FHEVM
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nInitializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();
  }

  console.log(`\nRegistering ${REAL_PATIENTS.length} real patients...`);

  for (let i = 0; i < REAL_PATIENTS.length; i++) {
    const patient = REAL_PATIENTS[i];
    
    try {
      console.log(`\n[${i + 1}/${REAL_PATIENTS.length}] Registering: ${patient.name}`);
      console.log(`  Address: ${patient.address}`);
      console.log(`  ID: ${patient.id}`);

      // Check if patient already exists
      const exists = await medicalRecords.isPatientRegistered(patient.address);
      if (exists) {
        console.log(`  Patient already registered, skipping...`);
        continue;
      }

      // Detect contract version and register accordingly
      let registerTx;
      
      try {
        // Try v2 method (public name)
        const encryptedInput = await fhevm.createEncryptedInput(CONTRACT_ADDRESS, foundation.address);
        encryptedInput.add32(patient.id);
        const encrypted = await encryptedInput.encrypt();

        registerTx = await medicalRecords
          .connect(foundation)
          .registerPatient(
            patient.address,
            patient.name,
            encrypted.handles[0],
            encrypted.inputProof
          );
        
        console.log("  Using v2 registration (public name)");
        
      } catch (error) {
        // Fallback to v1 method (encrypted name)
        console.log("  Using v1 registration (encrypted name)");
        
        const nameBytes = Buffer.from(patient.name, 'utf8');
        const encryptedInput = await fhevm.createEncryptedInput(CONTRACT_ADDRESS, foundation.address);
        
        for (let j = 0; j < nameBytes.length; j++) {
          encryptedInput.add8(nameBytes[j]);
        }
        encryptedInput.add32(patient.id);
        
        const encrypted = await encryptedInput.encrypt();
        const nameHandles = encrypted.handles.slice(0, nameBytes.length);
        const idHandle = encrypted.handles[nameBytes.length];

        registerTx = await medicalRecords
          .connect(foundation)
          .registerPatient(
            patient.address,
            nameHandles,
            nameBytes.length,
            idHandle,
            encrypted.inputProof
          );
      }
      
      console.log(`  Tx: ${registerTx.hash}`);
      await registerTx.wait();
      console.log(`  Patient registered successfully`);

      // Add diseases
      for (const disease of patient.diseases) {
        console.log(`    Adding disease: ${disease}`);
        
        const diseaseBytes = Buffer.from(disease, 'utf8');
        const diseaseInput = await fhevm.createEncryptedInput(CONTRACT_ADDRESS, foundation.address);
        
        for (let k = 0; k < diseaseBytes.length; k++) {
          diseaseInput.add8(diseaseBytes[k]);
        }
        
        const diseaseEncrypted = await diseaseInput.encrypt();

        const diseaseTx = await medicalRecords
          .connect(foundation)
          .addDisease(
            patient.address,
            diseaseEncrypted.handles,
            diseaseBytes.length,
            diseaseEncrypted.inputProof
          );

        await diseaseTx.wait();
        console.log(`    Disease added`);
      }

    } catch (error) {
      console.error(`Error registering ${patient.name}:`, error);
    }
  }

  // Final stats
  const totalPatients = await medicalRecords.getTotalPatients();
  console.log(`\nTotal patients in contract: ${totalPatients}`);
  
  console.log("\nReal patients registered! Next steps:");
  console.log("1. Patients need to connect their wallets to grant access");
  console.log("2. Doctors/entities need patient authorization to access data");
  
  if (hre.network.name === "sepolia") {
    console.log(`\nEtherscan: https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Registration failed:", error);
    process.exit(1);
  });