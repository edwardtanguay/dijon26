import { backupDatabase } from "../../scripts/db-backup";

export const execute = async () => {
	await backupDatabase();
};

execute();
