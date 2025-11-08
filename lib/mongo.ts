import { MongoClient, Db, ObjectId } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
	if (cachedClient) return cachedClient;
	const uri = process.env.MONGODB_URI;
	if (!uri) throw new Error('MONGODB_URI is not set');

	const allowInsecureTls = String(process.env.MONGO_TLS_INSECURE || '').toLowerCase() === 'true';
	const baseOptions: any = {
		serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
		connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 5000),
		socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 15000),
		...(allowInsecureTls ? { tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true } : {}),
	};

	const isTlsError = (msg: string) =>
		/SSL routines|tlsv1|handshake|certificate|hostname|self[- ]signed|openssl/i.test(msg);

	try {
		const client = new MongoClient(uri, baseOptions);
		await client.connect();
		cachedClient = client;
		return client;
	} catch (err: any) {
		const message = String(err?.message || err || '');
		if (isTlsError(message)) {
			const insecureOptions = { ...baseOptions, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true };
			const insecureClient = new MongoClient(uri, insecureOptions);
			await insecureClient.connect();
			console.warn('[mongo] TLS handshake failed, connected with relaxed TLS (dev only)');
			cachedClient = insecureClient;
			return insecureClient;
		}
		throw err;
	}
}

export async function getMongoDb(): Promise<Db> {
	if (cachedDb) return cachedDb;
	const client = await getMongoClient();
	const uri = process.env.MONGODB_URI || '';
	const envName = process.env.MONGODB_DB;
	const uriNameMatch = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
	const derivedName = uriNameMatch && uriNameMatch[1] ? decodeURIComponent(uriNameMatch[1]) : undefined;
	const dbName = envName || derivedName || 'bikerental';
	cachedDb = client.db(dbName);
	try {
		await cachedDb.command({ ping: 1 });
		console.log(`[mongo] connected to database: ${dbName}`);
	} catch {}
	return cachedDb;
}

export function toObjectId(id: string): ObjectId {
	try {
		return new ObjectId(id);
	} catch {
		throw new Error(`Invalid ObjectId: ${id}`);
	}
}

export function maybeObjectId(id: string): any {
	try {
		return new ObjectId(id);
	} catch {
		return id;
	}
}



