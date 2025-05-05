// Test script for bulk user import functionality
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current file directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test CSV file
const csvFilePath = path.join(__dirname, "sample_users.csv");

// Function to read and parse CSV content
function readCsvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    return null;
  }
}

// Simple CSV parser (similar to what we have in AdminUsers.tsx)
function parseCSVData(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    console.error("CSV must have a header row and at least one data row");
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIndex = headers.findIndex((h) => h.includes("name"));
  const emailIndex = headers.findIndex((h) => h.includes("email"));
  const balanceIndex = headers.findIndex((h) => h.includes("balance"));
  const roleIndex = headers.findIndex((h) => h.includes("role"));
  const statusIndex = headers.findIndex((h) => h.includes("status"));

  // Simulate existing emails in the system
  const existingEmails = new Set(["existing@example.com", "used@nawec.com"]);
  const emailsInFile = new Set();

  // Process each row
  return lines.slice(1).map((line, idx) => {
    const values = line.split(",").map((v) => v.trim());
    const errors = [];

    // Extract values with validation
    const name = nameIndex >= 0 ? values[nameIndex] : "";
    const email = emailIndex >= 0 ? values[emailIndex] : "";
    const balanceStr = balanceIndex >= 0 ? values[balanceIndex] : "0";
    const role = roleIndex >= 0 ? values[roleIndex]?.toLowerCase() : "regular";
    const status =
      statusIndex >= 0 ? values[statusIndex]?.toLowerCase() : "active";

    // Validate required fields
    if (!name) {
      errors.push("Name is required");
    }

    if (!email) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // Basic email format validation
      errors.push("Invalid email format");
    } else {
      // Check for duplicates within the file
      if (emailsInFile.has(email.toLowerCase())) {
        errors.push("Duplicate email in import file");
      } else {
        emailsInFile.add(email.toLowerCase());
      }

      // Check for duplicates with existing users
      if (existingEmails.has(email.toLowerCase())) {
        errors.push("Email already exists in the system");
      }
    }

    // Validate balance
    let balance = 0;
    if (balanceStr) {
      const parsedBalance = parseFloat(balanceStr);
      if (isNaN(parsedBalance) || parsedBalance < 0) {
        errors.push("Balance must be a positive number");
      } else {
        balance = parsedBalance;
      }
    }

    // Validate role
    if (role && !["regular", "admin"].includes(role)) {
      errors.push("Role must be regular or admin");
    }

    // Validate status
    if (status && !["active", "inactive"].includes(status)) {
      errors.push("Status must be active or inactive");
    }

    return {
      rowId: idx,
      data: {
        full_name: name,
        email,
        initial_balance: balance,
        role: role || "regular",
        status: status || "active",
      },
      isValid: errors.length === 0,
      errors,
      include: errors.length === 0, // Only include valid records by default
    };
  });
}

// Main test function
function runTest() {
  console.log("Running bulk import validation test...\n");

  // Read the CSV file
  const csvContent = readCsvFile(csvFilePath);
  if (!csvContent) return;

  // Parse and validate the data
  const parsedUsers = parseCSVData(csvContent);

  // Display results
  console.log(`Total records found: ${parsedUsers.length}`);
  console.log(`Valid records: ${parsedUsers.filter((u) => u.isValid).length}`);
  console.log(
    `Invalid records: ${parsedUsers.filter((u) => !u.isValid).length}\n`
  );

  // Show detailed validation results
  parsedUsers.forEach((user, index) => {
    console.log(
      `Record #${index + 1}: ${user.data.full_name} <${user.data.email}>`
    );
    console.log(
      `  Balance: ${user.data.initial_balance}, Role: ${user.data.role}, Status: ${user.data.status}`
    );
    console.log(`  Valid: ${user.isValid ? "Yes" : "No"}`);

    if (!user.isValid) {
      console.log("  Errors:");
      user.errors.forEach((error) => console.log(`    - ${error}`));
    }
    console.log();
  });

  // Show a summary of what would be imported
  const validUsers = parsedUsers.filter((u) => u.isValid);
  if (validUsers.length > 0) {
    console.log("Users that would be imported:");
    validUsers.forEach((user) => {
      console.log(`  - ${user.data.full_name} (${user.data.email})`);
    });
  }

  // Also test with the errors file if it exists
  const errorsFilePath = path.join(__dirname, "sample_users_with_errors.csv");
  if (fs.existsSync(errorsFilePath)) {
    console.log("\n=========================================");
    console.log("Testing with error sample file:");
    console.log("=========================================\n");

    const errorsCsvContent = readCsvFile(errorsFilePath);
    if (errorsCsvContent) {
      const parsedErrorUsers = parseCSVData(errorsCsvContent);

      console.log(`Total records found: ${parsedErrorUsers.length}`);
      console.log(
        `Valid records: ${parsedErrorUsers.filter((u) => u.isValid).length}`
      );
      console.log(
        `Invalid records: ${
          parsedErrorUsers.filter((u) => !u.isValid).length
        }\n`
      );

      parsedErrorUsers.forEach((user, index) => {
        if (!user.isValid) {
          console.log(
            `Error Record #${index + 1}: ${
              user.data.full_name || "[Missing Name]"
            } <${user.data.email || "[Missing Email]"}>`
          );
          console.log("  Errors:");
          user.errors.forEach((error) => console.log(`    - ${error}`));
          console.log();
        }
      });
    }
  }
}

// Execute the test
runTest();
