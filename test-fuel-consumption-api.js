/**
 * Test Script: Query vehicle data via the Express API
 * Run this from the car-api directory: node test-fuel-consumption-api.js
 */

import { vehicleService } from './src/services/vehicle.service.js';

async function testFuelConsumptionData() {
    console.log('🔍 Testing Fuel Consumption Data Retrieval\n');
    console.log('=' .repeat(60));

    try {
        // Test 1: Get specific vehicle details
        console.log('\n📋 Test 1: Fetch "Alfa Romeo Giulia 2.0T Veloce" details\n');
        const vehicleDetails = await vehicleService.getVehicleDetails('Alfa Romeo', 'Giulia 2.0T Veloce');
        
        console.log('Full Vehicle Object:');
        console.log(JSON.stringify(vehicleDetails, null, 2));
        
        console.log('\n🎯 Fuel Consumption Value:');
        console.log(`   Value: "${vehicleDetails.fuelConsumption}"`);
        console.log(`   Type: ${typeof vehicleDetails.fuelConsumption}`);
        console.log(`   Is Empty: ${vehicleDetails.fuelConsumption === '' || vehicleDetails.fuelConsumption === null}`);
        
        // Test 2: Get performance data specifically
        console.log('\n📋 Test 2: Fetch Performance Data\n');
        const performanceData = await vehicleService.getPerformance('Alfa Romeo', 'Giulia 2.0T Veloce');
        
        console.log('Performance Data:');
        console.log(JSON.stringify(performanceData, null, 2));
        
        // Test 3: Compare with another model
        console.log('\n📋 Test 3: Compare with Giulia Quadrifoglio\n');
        const quadrifoglioDetails = await vehicleService.getVehicleDetails('Alfa Romeo', 'Giulia Quadrifoglio');
        
        console.log('Giulia Quadrifoglio Fuel Consumption:');
        console.log(`   Value: "${quadrifoglioDetails.fuelConsumption}"`);
        console.log(`   Type: ${typeof quadrifoglioDetails.fuelConsumption}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Test Complete\n');
        
    } catch (error) {
        console.error('❌ Error during test:');
        console.error(error.message);
        console.error('\nFull Error:');
        console.error(error);
    }
}

// Run the test
testFuelConsumptionData();
