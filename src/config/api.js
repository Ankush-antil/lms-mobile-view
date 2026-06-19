// ⚠️ IMPORTANT: Apne PC ka local IP yahan set karo
// Windows mein CMD open karo aur "ipconfig" type karo
// IPv4 Address jo mile use yahan dalo (e.g., 192.168.1.5)
// Android Emulator ke liye: http://10.0.2.2:5000

export const LOCAL_IP = '10.141.114.237'; // ✅ Auto-detected IP (update karo agar badal jaye)
export const PORT = '5000';

export const BASE_URL = `http://${LOCAL_IP}:${PORT}`;

export const API_URL = `${BASE_URL}/api`;
