// -----------------------------------------------------
// src/utils/testLipanaConfig.ts
// Quick test to verify Lipana configuration
// -----------------------------------------------------

import { LIPANA_API } from '@/constants/mpesa';

export function testLipanaConfig() {
  console.log('🔑 Lipana Configuration Test:');
  console.log('✅ Base URL:', LIPANA_API.BASE_URL);
  console.log('✅ Public Key:', LIPANA_API.PUBLIC_KEY.substring(0, 20) + '...');
  console.log('✅ Secret Key:', LIPANA_API.SECRET_KEY.substring(0, 20) + '...');
  
  // Verify key formats
  const publicKeyValid = LIPANA_API.PUBLIC_KEY.startsWith('lip_pk_live_');
  const secretKeyValid = LIPANA_API.SECRET_KEY.startsWith('lip_sk_live_');
  
  console.log('✅ Public Key Format Valid:', publicKeyValid);
  console.log('✅ Secret Key Format Valid:', secretKeyValid);
  
  return {
    valid: publicKeyValid && secretKeyValid,
    publicKeyValid,
    secretKeyValid,
  };
}

// Quick API test function
export async function testLipanaAPI() {
  try {
    const response = await fetch(`${LIPANA_API.BASE_URL}/transactions`, {
      method: 'GET',
      headers: {
        'x-api-key': LIPANA_API.SECRET_KEY,
      },
    });
    
    console.log('🌐 API Test Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Connection Successful');
      return { success: true, data };
    } else {
      console.log('❌ API Error:', response.status, response.statusText);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ API Connection Failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
