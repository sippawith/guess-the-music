import axios from 'axios';

async function getClientToken() {
  try {
    const res = await axios.post('https://clienttoken.spotify.com/v1/clienttoken', {
      client_data: {
        client_version: "1.2.88.250.gd8cceb8f",
        client_id: "d8a5ed958d274c2e8ee717e6a4b0971d", // Web player client ID
        js_sdk_data: {
          device_brand: "unknown",
          device_model: "unknown",
          os: "windows",
          os_version: "NT 10.0",
          device_id: "unknown",
          device_type: "computer"
        }
      }
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log("Client token:", res.data);
  } catch (e: any) {
    console.error("Error:", e.message);
    if (e.response) console.error(e.response.data);
  }
}

getClientToken();
