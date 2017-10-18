# lexpress文档
## 简介
- lexpress基于nodejs的Connect模块的思想开发，将蓝牙扫描的数据、notify数据、hub上下线、蓝牙设备上下线数据视为不同方法的http请求处理。lexpress是一个中间件管理框架，允许开发者对不同的‘请求’注册多个处理方法，根据过滤条件，请求依次经过注册的处理方法。当经过最后一个处理方法后，此条请求将被丢弃。lexpress不需要对请求进行回复，对请求的处理主要在注册的处理方法中进行。
-  当收到一个请求时，该请求会依次经过所有注册的中间件的测试条件，如果请求满足某个中间件的测试条件，将执行该测试条件相应的处理函数，然后根据处理函数是否调用next()，决定是否进入下个测试条件。

## API说明
###  1.  ```lexpress``` 实例化
  - ``` lexpress```是一个构造函数，使用前需要先实例化。实例化：```var app = new lexpress()```
###  2. ``` app.listen (option[,fn]) ```
- ```option```  < object > 接入AC的配置信息
- `fn` < function > 申请到当前AC的token后的回调函数
```
 option:{
  address: 'http://127.0.0.1:3002/api',
  name: 'me',
  developer: 'cassia',
  secret: 'cassia' 
} 
```
###  3. ``` app.use ([option,]fn]) ```
函数传入一个参数，或者两个参数
传入一个参数：
	当option的类型是function时，所有的请求都会经过该处理函数。
	当option的类型是array，option的每个元素需要是处理请求函数，请求会经过第一个注册处理函数，处理函数中是否调用`next.call(this)`，决定是否经过下个处理函数。
传入两个参数：
	当option的类型是function，fn的类型是function时，第一个函数为测试条件，当满足时，执行fn
	当option的类型是object，fn的类型是function时，option会作为测试条件，当请求满足option时，执行fn	
  当option的类型是object，fn的类型是array时,array的每个元素都需要是请求处理函数，满足条件时，处理函数将依次执行
```
option的格式，其中address是AC的name或者url，mac是蓝牙路由器的MAC，route是返回true或者false的函数
  {
     address: this.name || this.address, //字符串，数组，正则，函数（传入参数是req.address）
     mac:11:22:33:44:55:66,//字符串，数组，正则，函数（传入参数是req.mac）
     route:fn2  //函数，传入参数是req
  }
```
###  4. ``` app.scan ([option,]fn])  app.hub ([option,]fn]) app.le([option,]fn]) app.notify([option,]fn])```
函数传入一个参数，或者两个参数
传入一个参数：
	当option的类型是function时，所有的请求都会经过该处理函数。
	当option的类型是array，option的每个元素需要是处理请求函数，请求会经过第一个注册处理函数，处理函数中是否调用`next.call(this)`，决定是否经过下个处理函数。
传入两个参数：
	当option的类型是function，fn的类型是function时，第一个函数为测试条件，当满足时，执行fn
	当option的类型是object，fn的类型是function时，option会作为测试条件，当请求满足option时，执行fn	
  当option的类型是object，fn的类型是array时,array的每个元素都需要是请求处理函数，满足条件时，处理函数将依次执行



option的每个元素需要是函数，为所有的请求注册fn这个处理函数，当函数返回true时代表该请求符合条件，将执行该测试条件对应的处理函数。反之则自动进入下个中间件的测试条件。
	当option是


