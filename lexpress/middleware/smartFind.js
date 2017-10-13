module.exports = function (req, res, next) {
  /**
   * {
    'cc:1b:e0:e0:11:22': {
      devicesValue: {
        '11:22:33:44:55:66': 80,
        '22:33:44:55:66:77': 88
      }
    },
    'cc:1b:e0:e0:33:44': {
      devicesValue: {
        '11:22:33:44:55:66': 83,
        '22:33:44:55:66:77': 90,
        '33:44:55:66:77:88': 91
      }
    }
  }

   */

  // var o = {
  //   'cc:1b:e0:e0:11:22': {
  //     devicesValue: {
  //       '11:22:33:44:55:66': 80,
  //       '22:33:44:55:66:77': 88
  //     }
  //   },
  //   'cc:1b:e0:e0:33:44': {
  //     devicesValue: {
  //       '11:22:33:44:55:66': 83,
  //       '22:33:44:55:66:77': 90,
  //       '33:44:55:66:77:88': 91
  //     }
  //   }
  // };

  const HUBBASEINFO = {
    C1000: {
      model: 'c1000',
      maxConnectNum: 10,
      baseWeight: 0,
      everyConnectWeight: -2
    },
    S1000: {
      model: 's1000',
      maxConnectNum: 5,
      baseWeight: 0,
      everyConnectWeight: -3
    },
    S1100: {
      model: 's1100',
      maxConnectNum: 5,
      baseWeight: 0,
      everyConnectWeight: -3
    }
  };

  const INTERVAL = 4;
  const MAGICNUM = 0;
  const HISTORYWEIGHT = 0;
  const NOWWEIGHT = 1;
  const MINWEIGHT = -70;
  const MINTIMES = 3;
  const CONNECTEDINTERVAL = 3;
  const HUBSSTATUSEXPIRE = 5;
  const IGNORERSSIAVG = 1;

  let bufferData = {
    // '11:22:33:44:55:66': {
    //   'cc:1b:e0:e0:11:22': {
    //     rssiArr: [-50, -70],
    //     rssiAvg: -60
    //   },
    //   'cc:1b:e0:e0:22:33': {
    //     rssiArr: [-50, -70],
    //     rssiAvg: -60
    //   }
    // }
  };
  let position = {
    // '11:22:33:44:55:66': [{
    //   hubMac: 'cc:1b:e0:e0:11:22',
    //   rssiArr: [],
    //   rssiAvg: -44
    // }]
  };

  let oldBufferData;

  function setBufferData(data, hubMac, myac) {
    const deviceMac = data.bdaddrs[0].bdaddr;
    const rssi = data.rssi + MAGICNUM;

    if (bufferData.time === undefined) {
      bufferData.time = INTERVAL;
    }
    if (bufferData[deviceMac]) {
      if (bufferData[deviceMac][hubMac]) {
        bufferData[deviceMac][hubMac].rssiArr.push(rssi);
      } else {
        bufferData[deviceMac][hubMac] = {
          rssiArr: [rssi]
        };
      }
    } else {
      bufferData[deviceMac] = {
        [hubMac]: {
          rssiArr: [rssi]
        }
      };
    }
  }

  function getBufferDataArrAvg(bufferData) {
    bufferDataInterate(bufferData, function (bufferData, hubMac, deviceMac) {
      bufferData[deviceMac][hubMac].rssiAvg = getArrAvg(bufferData[deviceMac][hubMac].rssiArr);
    });
  }

  function bufferDataInterate(bufferData, fn) {
    for (let deviceMac in bufferData) {
      for (let hubMac in bufferData[deviceMac]) {
        fn && fn(bufferData, hubMac, deviceMac);
      }
    }
  }

  function getArrAvg(arr) {
    if (!arr.length) {
      return;
    }
    return arr.reduce((pre, cur) => pre + cur) / arr.length;
  }

  function filterPosition(position) {
    for (let deviceMac in position) {
      position[deviceMac] = position[deviceMac].filter((v) => {
        if (MINWEIGHT > v.weight) {
          // console.log(`deviceMac ${deviceMac}  weight ${v.weight.toFixed(2)}     in hubMac ${v.hubMac} less MINWEIGHT ${MINWEIGHT}`);
        }
        if (MINTIMES > v.rssiArr.length) {
          // console.log(`deviceMac ${deviceMac}  rssiArr length ${v.rssiArr.length}  in hubMac ${v.hubMac} less MINTIMES ${MINTIMES}`);
        }
        return MINWEIGHT <= v.weight && MINTIMES <= v.rssiArr.length;
      });
      if (!position[deviceMac].length) {
        // console.info('filterPosition delete', deviceMac);
        delete position[deviceMac];
      }
    }
  }

  function addWeightForBufferData(bufferData) {
    bufferDataInterate(bufferData, function (bufferData, hubMac, deviceMac) {
      const connectedArr = getHubStatus(hubMac).connected || '';
      const model = getHubStatus(hubMac).model || '';
      const aviable = getHubStatus(hubMac).aviable || false;
      const rssiAvg = bufferData[deviceMac][hubMac].rssiAvg;

      bufferData[deviceMac][hubMac].connected = connectedArr;
      bufferData[deviceMac][hubMac].model = model;
      bufferData[deviceMac][hubMac].aviable = aviable;
      bufferData[deviceMac][hubMac].weight = getWeight({
        hubMac,
        aviable,
        connectedArr,
        rssiAvg,
        baseInfo: HUBBASEINFO[model],
        ac
      });
    });
  }

  function getVariance(arr, avg) {
    const _avg = avg || getArrAvg(arr);
    const len = arr.length;

    return arr.reduce((prev, curr) => {
      return prev + Math.pow((curr - _avg), 2);
    }, 0) / len;
  }

  function getWeight(info = {
    hubMac: '',
    aviable: '',
    connectedArr: [],
    rssiAvg: '',
    baseInfo: {},
    ac: ''
  }) {
    if (info.connectedArr.length >= info.baseInfo.maxConnectNum) {
      return -100;
    } else if (!info.aviable) {
      return -100;
    } else if (!ac.get(info.hubMac)) {
      return -100;
    } else if (ac.isConnecting(info.hubMac)) {
      return -100;
    } else {
      return info.rssiAvg + info.baseInfo.baseWeight + info.baseInfo.everyConnectWeight * info.connectedArr.length;
    }
  }

  function rankPosition(position) {
    for (let deviceMac in position) {
      position[deviceMac] = position[deviceMac].sort((a, b) => {
        if (Math.abs(b.weight - a.weight) < IGNORERSSIAVG) {
          a.variance = getVariance(a.rssiArr, a.rssiAvg);
          b.variance = getVariance(b.rssiArr, b.rssiAvg);
          return a.variance - b.variance;
        }
      });
    }
  }

  function bufferDataToPositonFormat(bufferData) {
    const result = {};

    bufferDataInterate(bufferData, function (bufferData, hubMac, deviceMac) {
      const temp = bufferData[deviceMac][hubMac];

      temp.hubMac = hubMac;
      if (result[deviceMac]) {
        result[deviceMac].push(temp);
      } else {
        result[deviceMac] = [temp];
      }
    });
    return result;
  }

  let hubsStatus = {};

  function getHubStatus(hubMac) {
    return hubsStatus[hubMac] || {};
  }

  function getAllHubConnectNum() {
    if (!ac.getHubs) {
      return;
    }
    if (!Object.keys(ac.getHubs()).length) {
      return;
    }
    for (let hub in ac.getHubs()) {
      ac.get(hub).getConnectedList({
        timeout: 5
      }).then(function (d) {
        let t;

        try {
          t = JSON.parse(d).nodes;
        } catch (e) {
          console.error('get hub connected list formate err', hub);
        }
        hubsStatus[hub] = {
          model: ac.get(hub).model,
          aviable: true,
          time: HUBSSTATUSEXPIRE
        };
        if (Array.isArray(t)) {
          hubsStatus[hub].connected = t.map(v => v.id);
        } else {
          hubsStatus[hub].connected = [];
        }

      }).catch(function (e) {
        console.error('get connected devices err', hub, e);
        hubsStatus[hub] = {
          model: ac.get(hub).model,
          aviable: false,
          time: 0
        };
      });
    }
  }

  function hubsStatusLoop() {
    for (let hubMac in hubsStatus) {
      if (hubsStatus[hubMac].time) {
        hubsStatus[hubMac].time--;
      } else {
        hubsStatus[hubMac].aviable = false;
        console.error(`get connected devices timeout in hub ${hubMac}`);
      }
    }
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function start() {
    let positionInterval = INTERVAL;
    let connectedInterval = CONNECTEDINTERVAL;

    setInterval(function () {
      if (!positionInterval) {
        positionInterval = INTERVAL;
        oldBufferData = deepCopy(bufferData);
        getBufferDataArrAvg(oldBufferData);
        // console.info(oldBufferData);
        bufferData = {};
      } else {
        positionInterval--;
      }
      if (!connectedInterval) {
        connectedInterval = CONNECTEDINTERVAL;
        getAllHubConnectNum();
      } else {
        connectedInterval--;
      }
      hubsStatusLoop();
    }, 1000);
  };

  function findHub(deviceMac) {
    addWeightForBufferData(oldBufferData);
    position = bufferDataToPositonFormat(oldBufferData);
    filterPosition(position);
    rankPosition(position);
    if (position[deviceMac]) {
      // console.log(`select ${deviceMac} hub`, position[deviceMac][0]);
      return Promise.resolve({
        [deviceMac]: position[deviceMac][0].hubMac
      });
    }
    // console.log(`select ${deviceMac} hub empty`);
    return Promise.resolve({
      [deviceMac]: ''
    });
  }

  start();

  exports.hubConnected = function () {
    return hubsStatus;
  };
  this.getHubMac = findHub;

};
