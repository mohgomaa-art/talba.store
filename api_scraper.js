import dotenv from 'dotenv';
dotenv.config();

const BASE = 'https://merchant.api.taager.com';
const phone = process.env.TAAGER_PHONE;
const pass = process.env.TAAGER_PASS;

async function tryLogin(body) {
    const res = await fetch(`${BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log(`[${res.status}] Body: ${JSON.stringify(body)}`);
    console.log(`Response: ${text.slice(0, 500)}`);
    console.log('---');
    return { status: res.status, data: text };
}

async function main() {
    // Try different field names
    await tryLogin({ phoneNumber: phone, password: pass });
    await tryLogin({ phoneNumber: `+${phone}`, password: pass });
    await tryLogin({ phoneNumber: `+2${phone.slice(2)}`, password: pass });
    await tryLogin({ phone: phone, password: pass });
    await tryLogin({ email: phone, password: pass });
    await tryLogin({ phoneNum: phone, password: pass, country: 'eg' });
    await tryLogin({ phoneNumber: phone, password: pass, country: 'eg' });
}

main();
