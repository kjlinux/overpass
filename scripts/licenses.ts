import { auditLicenses } from "./checks/licenses.ts";

const errors = auditLicenses(true);
for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
else console.log("docs/LICENSES.md written, all licences allowed.");
