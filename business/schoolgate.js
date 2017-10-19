module.exports = function () {
  const Event = require('events');
  const emitter = new Event();
  var timeWindow = 6;
  var schoolGateHubs = {
    door1: {
      in: ['CC:1B:E0:E0:D9:CC'],
      out: ['CC:1B:E0:E0:C4:54']
    },
    door2: {
      in: ['CC:1B:E0:E0:A7:B3'],
      out: ['CC:1B:E0:E0:21:5C']
    }
  };
  var schoolGateBuffer = {};
  var schoolGateDevices = {};

  schoolGateBufferInit(schoolGateHubs);
  schoolGateDevicesInit(schoolGateHubs);

  function scanParse(scanData) {
    // console.log('schoolGate --> scanParse!!~~', scanData);
    let hubMac = scanData.mac;
    let deviceMac = scanData.node;
    let rssi = scanData.rssi;

    data2buffer(hubMac, deviceMac, rssi);
  }
  /**
   * schoolGateBuffer: {
   *   'door1': {
   *     'AA:BB': {
   *       'deviceMac': 'AA:BB',
   *       'data': {
   *         'CC:1B': [-30, -60],
   *         'CC:1B': [-40, -40]
   *       }
   *     },
   *     'CC:DD': {}
   *   },
   *   'door2': {
   *     'AA:BB': {
   *       'deviceMac': 'AA:BB',
   *       'data': {
   *         'CC:1B': [-30, -60],
   *         'CC:1B': [-40, -40]
   *       }
   *     },
   *     'CC:DD': {}
   *   }
   * }
   */
  function data2buffer(hubMac, deviceMac, rssi) {
    // console.log('schoolGate.js --> data2buffer --> run', hubMac, deviceMac, rssi);
    for (let i in schoolGateHubs) {
      if (schoolGateHubs[i].in.indexOf(hubMac) !== -1 || schoolGateHubs[i].out.indexOf(hubMac) !== -1) {
        if (!schoolGateBuffer[i][deviceMac]) {
          schoolGateBuffer[i][deviceMac] = {
            deviceMac: deviceMac,
            data: {}
          };
          schoolGateBuffer[i][deviceMac].data[hubMac] = [rssi];
        } else {
          try {
            if (!schoolGateBuffer[i][deviceMac].data[hubMac]) {
              schoolGateBuffer[i][deviceMac].data[hubMac] = [];
            }
            schoolGateBuffer[i][deviceMac].data[hubMac].push(rssi);
          } catch (e) {
            // console.log('schoolGate.js --> data2buffer --> err :', e);
          };
        }
      }
      // console.log('schoolGate.js --> data2buffer --> schoolGateBuffer:', schoolGateBuffer);
    }
  };
  setInterval(function() {
    buffer2devices();
    for (let door in schoolGateDevices) {
      for (let node in schoolGateDevices) {
        let deviceMac = schoolGateDevices[door][node].deviceMac;

        paddingData(deviceMac, schoolGateDevices[door], door);
      }
    }

  }, 5000);

  /**
   * 
   * schoolGateDevices:{ 
   *   door1:{ 
   *    'DF:97:AB:CC:2D:78':{ 
   *      deviceMac: 'DF:97:AB:CC:2D:78',
   *      lastPosition: null,
   *      nowPosition: null,
   *      point: 0,
   *      value: [Object] 
   *    },
   *    'EC:5C:66:6C:4E:FE':{
   *      deviceMac: 'EC:5C:66:6C:4E:FE',
   *      lastPosition: null,
   *      nowPosition: null,
   *      point: 0,
   *      value: [Object] 
   *    } 
   *  },
   *  door2:{ 
   *    'EC:5C:66:6C:4E:FE':{ 
   *      deviceMac: 'EC:5C:66:6C:4E:FE',
   *      lastPosition: null,
   *      nowPosition: null,
   *      point: 0,
   *      value: [Object] 
   *    } 
   *  } 
   *} 
   *    
   */
  function buffer2devices() {
    for (let door in schoolGateBuffer) {
      for (let i in schoolGateBuffer[door]) {
        let deviceMac = schoolGateBuffer[door][i].deviceMac;
        let data = schoolGateBuffer[door][i].data;
        let value = {};
        let hubinArr = schoolGateHubs[door].in;
        let huboutArr = schoolGateHubs[door].out;

        for (let j = 0, len = hubinArr.length; j < len; j++) {
          value[hubinArr[j]] = null;
        }

        for (let j = 0, len = huboutArr.length; j < len; j++) {
          value[huboutArr[j]] = null;
        }

        for (var k in data) {
          value[k] = rssiAve(data[k]);
        }

        if (!schoolGateDevices[door][deviceMac]) {
          schoolGateDevices[door][deviceMac] = {
            'deviceMac': deviceMac,
            'lastPosition': null,
            'nowPosition': null,
            'point': 0,
            'value': [value]
          };
        } else {
          schoolGateDevices[door][deviceMac].point++;
          if (schoolGateDevices[door][deviceMac].point > timeWindow) {schoolGateDevices[door][deviceMac].point = 0;}
          schoolGateDevices[door][deviceMac].value[schoolGateDevices[door][deviceMac].point] = value;
        }
      }
    }
    // console.log('schoolGate.js --> devices:', schoolGateDevices);
  }
  // 当路由器没有扫描到该设备，则填充null
  function paddingData(deviceMac, devices, door) {
    if (!schoolGateBuffer[door][deviceMac]) {
      let value = {};
      let hubinArr = schoolGateHubs[door].in;
      let huboutArr = schoolGateHubs[door].out;

      for (let j = 0, len = hubinArr.length; j < len; j++) {
        value[hubinArr[j]] = null;
      }

      for (let j = 0, len = huboutArr.length; j < len; j++) {
        value[huboutArr[j]] = null;
      }

      devices[deviceMac].point++;
      if (devices[deviceMac].point > timeWindow) {
        devices[deviceMac].point = 0;
      }
      devices[deviceMac].value[devices[deviceMac].point] = value;
    }
  }

  function rssiAve(arr) {
    if (arr === undefined) {return null;}
    // console.log(arr);
    let sum = 0;

    for (let i = 0;i < arr.length;i++) {
      sum += arr[i];
    }
    return parseInt(sum / arr.length, 10);
  }

  function setSchoolGateHubs(hubs) {
    schoolGateHubs = hubs;
  }

  function getSchoolGateHubs() {
    return schoolGateHubs;
  }
  function schoolGateBufferInit(obj) {
    for (let i in obj) {
      schoolGateBuffer[i] = {};
    }
    console.log('schoolGateBufferInit :', schoolGateBuffer, schoolGateDevices);
  }
  function schoolGateDevicesInit(obj) {
    for (let i in obj) {
      schoolGateDevices[i] = {};
    }
    console.log('schoolGateDevicesInit :', schoolGateBuffer, schoolGateDevices);
  }
  emitter.getSchoolGateHubs = getSchoolGateHubs;
  emitter.setSchoolGateHubs = setSchoolGateHubs;
  emitter.scanParse = scanParse;
  return emitter;
};

/**
 *    schoolGateHubs: {
 *      damen: {
 *        in: [],
 *        out: []
 *      },  
 *      door2: {
 *        in: [],
 *        out: []
 *      }
 *    }
 *    /*lastPosition 
 *    nowPosition
 *    position
 *    data
 *    lastBehave
 *    point
 *    window
 */
