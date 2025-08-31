// scripts/addDataToExistingContract.ts
import { ethers, fhevm } from "hardhat";
import hre from "hardhat";

// Your deployed contract address
const CONTRACT_ADDRESS = "0x9467A74FA655590739e5c5b617D10c35f2F1a7c4";

// Generate patient data
const generatePatientData = (startIndex: number, count: number) => {
  const firstNames = [
    "Juan", "María", "Carlos", "Ana", "Luis", "Carmen", "José", "Isabel", "Pedro", "Lucía",
    "Miguel", "Rosa", "Antonio", "Elena", "Francisco", "Pilar", "Manuel", "Teresa", "David", "Patricia",
    "Javier", "Laura", "Alejandro", "Cristina", "Rafael", "Silvia", "Sergio", "Andrea", "Pablo", "Marta",
    "Diego", "Beatriz", "Álvaro", "Natalia", "Adrián", "Mónica", "Iván", "Alicia", "Óscar", "Verónica",
    "Daniel", "Gloria", "Fernando", "Amparo", "Roberto", "Dolores", "Rubén", "Esperanza", "Víctor", "Remedios"
  ];

  const lastNames = [
    "García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín",
    "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez", "Romero", "Alonso", "Gutiérrez",
    "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Ramírez", "Serrano", "Blanco", "Suárez",
    "Molina", "Morales", "Ortega", "Delgado", "Castro", "Ortiz", "Rubio", "Marín", "Sanz", "Iglesias",
    "Medina", "Garrido", "Cortés", "Castillo", "Santos", "Lozano", "Guerrero", "Cano", "Prieto", "Méndez"
  ];

  const diseases = [
    "Diabetes Tipo 2", "Hipertensión Arterial", "Asma", "Artritis", "Depresión", "Ansiedad",
    "Obesidad", "Osteoporosis", "Gastritis", "Migraña", "Fibromialgia", "Hipotiroidismo",
    "Colesterol Alto", "Insuficiencia Venosa", "Dermatitis", "Bronquitis Crónica",
    "Síndrome Metabólico", "Reflujo Gastroesofágico", "Anemia", "Cataratas",
    "Artritis Reumatoide", "Epilepsia", "Glaucoma", "Insuficiencia Renal", "Hepatitis B",
    "Psoriasis", "Esclerosis Múltiple", "Parkinson", "Alzheimer", "Lupus"
  ];

  const patients = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    
    // Generate 1-4 random diseases
    const numDiseases = Math.floor(Math.random() * 4) + 1;
    const patientDiseases = [];
    const usedDiseases = new Set();
    
    for (let j = 0; j < numDiseases; j++) {
      let disease;
      do {
        disease = diseases[Math.floor(Math.random() * diseases.length)];
      } while (usedDiseases.has(disease));
      
      usedDiseases.add(disease);
      patientDiseases.push(disease);
    }
    
    patients.push({
      name,
      id: startIndex + i,
      diseases: patientDiseases
    });
  }
  
  return patients;
};

async function main() {
  console.log("Adding patient data to existing MedicalRecords contract...");
  console.log("Contract address:", CONTRACT_ADDRESS);
  console.log("Network:", hre.network.name);

  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log("Deployer address:", deployer.address);

  // Verify balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  // Connect to existing contract
  console.log("\nConnecting to existing contract...");
  const medicalRecords = await ethers.getContractAt("MedicalRecords", CONTRACT_ADDRESS);
  
  // Verify current contract state
  console.log("\nCurrent contract state:");
  try {
    const currentTotalPatients = await medicalRecords.getTotalPatients();
    console.log("Current total patients:", currentTotalPatients.toString());
    
    const isAuthorized = await medicalRecords.isFoundationAuthorized(deployer.address);
    console.log("Deployer authorized as foundation:", isAuthorized);

    if (!isAuthorized) {
      console.log("ERROR: Deployer is not authorized as foundation!");
      console.log("The contract owner needs to authorize this address first.");
      return;
    }

    // Check which version of contract this is by testing if it has new functions
    try {
      await medicalRecords.getTotalRegistrations();
      console.log("Contract version: v2 (with statistics)");
    } catch {
      console.log("Contract version: v1 (original)");
    }

  } catch (error) {
    console.error("Error checking contract state:", error);
    return;
  }

  // Initialize FHEVM
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nInitializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();
  }

  // How many patients to add?
  const patientsToAdd = 50; // You can change this number
  console.log(`\nAdding ${patientsToAdd} new patients...`);

  // Generate new patient data
  const nextPatientId = 30000; // Starting from 30000 to distinguish from previous batches
  const patients = generatePatientData(nextPatientId, patientsToAdd);
  console.log(`Generated data for ${patients.length} new patients`);

  // Register patients
  console.log("\nRegistering new patients...");
  
  let successCount = 0;
  let errorCount = 0;
  const registeredPatients = [];

  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    // Generate address for patient
    const patientAddress = ethers.Wallet.createRandom().address;

    try {
      if (i % 10 === 0 && i > 0) {
        console.log(`\nProgress: ${i}/${patientsToAdd} patients processed`);
      }
      
      console.log(`[${i + 1}/${patientsToAdd}] Registering: ${patient.name} (ID: ${patient.id})`);

      // Check contract version and register accordingly
      let registerTx;
      
      try {
        // Try v2 method first (public name, encrypted ID only)
        const encryptedInput = await fhevm.createEncryptedInput(CONTRACT_ADDRESS, deployer.address);
        encryptedInput.add32(patient.id);
        const encrypted = await encryptedInput.encrypt();

        registerTx = await medicalRecords
          .connect(deployer)
          .registerPatient(
            patientAddress,
            patient.name,           // Public name (v2)
            encrypted.handles[0],   // Encrypted ID
            encrypted.inputProof
          );
        
        console.log("  Using v2 registration method");
        
      } catch (error) {
        // Fallback to v1 method if v2 fails
        console.log("  Falling back to v1 registration method");
        
        const nameBytes = Buffer.from(patient.name, 'utf8');
        const encryptedInput = await fhevm.createEncryptedInput(CONTRACT_ADDRESS, deployer.address);
        
        // Add name bytes
        for (let j = 0; j < nameBytes.length; j++) {
          encryptedInput.add8(nameBytes[j]);
        }
        
        // Add ID
        encryptedInput.add32(patient.id);
        
        const encrypted = await encryptedInput.encrypt();
        const nameHandles = encrypted.handles.slice(0, nameBytes.length);
        const idHandle = encrypted.handles[nameBytes.length];

        registerTx = await medicalRecords
          .connect(deployer)
          .registerPatient(
            patientAddress,
            nameHandles,            // Encrypted name (v1)
            nameBytes.length,
            idHandle,               // Encrypted ID
            encrypted.inputProof
          );
      }
      
      await registerTx.wait();
      console.log(`  Patient registered successfully`);

      // Save registered patient data
      const patientData = {
        index: i + 1,
        name: patient.name,
        id: patient.id,
        address: patientAddress,
        diseases: patient.diseases,
        registrationTxHash: registerTx.hash
      };
      registeredPatients.push(patientData);

      // Add diseases (same for both versions)
      for (const disease of patient.diseases) {
        console.log(`    Adding disease: ${disease}`);
        
        const diseaseBytes = Buffer.from(disease, 'utf8');
        const diseaseInput = await fhevm.createEncryptedInput(CONTRACT_ADDRESS, deployer.address);
        
        for (let k = 0; k < diseaseBytes.length; k++) {
          diseaseInput.add8(diseaseBytes[k]);
        }
        
        const diseaseEncrypted = await diseaseInput.encrypt();

        const diseaseTx = await medicalRecords
          .connect(deployer)
          .addDisease(
            patientAddress,
            diseaseEncrypted.handles,
            diseaseBytes.length,
            diseaseEncrypted.inputProof
          );

        await diseaseTx.wait();
        console.log(`    Disease added successfully`);
      }

      successCount++;

      // Pause every 10 patients to avoid rate limiting
      if (i % 10 === 9) {
        console.log("  Pausing 3 seconds to avoid rate limiting...");
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

    } catch (error) {
      console.error(`Error registering patient ${i + 1} (${patient.name}):`, error);
      errorCount++;
    }
  }

  // Verify final state
  const finalTotalPatients = await medicalRecords.getTotalPatients();
  
  console.log("\nFinal Statistics:");
  console.log("Successfully added:", successCount);
  console.log("Errors:", errorCount);
  console.log("Total patients in contract:", finalTotalPatients.toString());
  
  // Try to get additional statistics if available (v2)
  try {
    const [totalPatients, totalDiseases, avgDiseases] = await medicalRecords.getSystemStatistics();
    console.log("Total diseases across all patients:", totalDiseases.toString());
    console.log("Average diseases per patient:", (Number(avgDiseases) / 100).toFixed(2));
  } catch {
    console.log("Extended statistics not available (v1 contract)");
  }
  
  console.log("\nContract address:", CONTRACT_ADDRESS);
  
  if (hre.network.name === "sepolia") {
    console.log("Etherscan:", `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`);
  }

  // Save patient data to file
  const timestamp = Date.now();
  const fs = require('fs');
  
  const additionSummary = {
    contractAddress: CONTRACT_ADDRESS,
    network: hre.network.name,
    deployer: deployer.address,
    patientsAdded: successCount,
    errors: errorCount,
    totalPatientsAfter: finalTotalPatients.toString(),
    addedAt: new Date().toISOString(),
    registeredPatients: registeredPatients
  };
  
  fs.writeFileSync(
    `patients-added-${hre.network.name}-${timestamp}.json`,
    JSON.stringify(additionSummary, null, 2)
  );

  console.log(`\nPatient data saved to: patients-added-${hre.network.name}-${timestamp}.json`);

  console.log("\nYou can now check the updated contract using:");
  console.log(`npx hardhat --network ${hre.network.name} medical:total-patients --contract ${CONTRACT_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Adding patients failed:", error);
    process.exit(1);
  });