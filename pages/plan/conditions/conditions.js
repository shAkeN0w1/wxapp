/*condition.js*/
/*此页面进行药物服用详情页面的显示 */



const app = getApp();
import mqtt from '../../../library/mqtt.js';
var util = require('../../../utils/util.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    client:null,             //获取全局对象
    scroll:0,
    number:null,
    dateArray:[],
    name:null,
    condition:"无异常",
    todayDate:null,
    persent:"0",
    persent2:0,
    timer:[],           //设定的服药时间数组
    timerToShow:null,     //设定的显示数组
    toolArray:[],
    showDrugTime:false,
    showLoading:true,
    showAll:false,
    showSaveHelp:false,
    feedbacktimeList:null,
    saveOK:false,
    err:'不正常',
    Nerr:'正常'
  },
  

  goToSaveHelp:function()       //跳转至存药页面
  {
    var urlNumber="../../index/saveHelp/saveHelp?number="+this.data.number.toString();    //拼接url
    wx.redirectTo({
      url: urlNumber,
    }, success => {
      console.log('sucess')
    })
  },



  backToPlansIndex:function(){   //当点击模态窗口上的红×时跳转回planINdex页面
    wx.navigateTo({
      url: "../plansIndex/plansindex.js",
    })
  },



  detail:function(e){         //显示当天的服药时间
    var obj=this.data.dateArray;
    if(!this.data.feedbacktimeList){
      var cacheList=wx.getStorageSync('timeList'+this.data.number.toString())
      this.setData({
        feedbacktimeList:cacheList
      })
    }
    if(!this.data.timerToShow){
      this.setData({
        str:'还未开始服药，请在服药后查看服药时间！'
      })
    }
    else{
      for(let i=0;i<obj.length;i++){
        if (obj[i] == e.currentTarget.id)
        {
          var list=[]
          for(let j=1;j<this.data.timer.length+1;j++){
            list.push(this.data.feedbacktimeList[i][j])
          }
          if(list[0].time){
          this.setData({
            timerToShow:list,
            saveOK:true
          })}
          else{
            this.setData({
              str:'还未开始服药，请在服药后查看服药时间！'
            })
          }
          break;
        }
      }
    }
    console.log(this.data.timerToShow)
    this.setData({
      showDrugTime:true
    })
  },


  hideModal:function(){           //隐藏服药时间模态窗口
    this.setData({
      showDrugTime: false
    })
  },


  mqttConnet:function(e){       //进行mqtt的连接，此链接是获得当天的服药时间
    // var that = this;
    // that.data.client = app.globalData.client;
    // that.data.client.on('connect', e => {
    //   console.log("ok");
    //   that.data.client.subscribe('ask', function (err) {
    //     if (!err) {
    //       console.log("here")
    //       that.data.client.publish('ask', that.data.number.toString())
    //     }
    //   })
    // });
    // that.data.client.subscribe('ask'+that.data.number.toString(),function(err){
    //   if(!err){
    //     that.data.client.on('message',function(topic,message){
    //       var obj=JSON.parse(message);
    //       if(obj instanceof Array){
    //         //write somthing
    //         that.setData({
    //           toolArray:obj
    //         })
    //         // console.log(obj,that.data.toolArray);
    //       }
    //     })
    //   }
    // })
  },



  
  scrollSteps:function() {     //进行横向日期的更改
    var that=this;
    for (let i = 0; i < this.data.dateArray.length;i++)
    {
      var toolDate = this.date2(this.data.dateArray[i]);
      console.log(toolDate.year)
      if (toolDate.year <=this.data.todayDate.year && toolDate.month <= this.data.todayDate.month && toolDate.day <= this.data.todayDate.day){
        var str = parseInt(((i + 1) / this.data.dateArray.length) * 100);
        var str2 = str.toString() + "%"
        this.setData({                              //设置滚动的日期
          scroll: this.data.scroll + 1,
          persent2: str,
          persent: str2,
        })
      }
      else{
        break;                  //满足条件时跳出循环
      }
      toolDate=null;
    }
  },


/**
 *    页面挂载时执行，对两个主题进行监听， 第一个主题是对是否存药、第二个主题是对服药反馈进行监听
 */
  onLoad: function (options) {
    var toolPlan = wx.getStorageSync(options.number.toString());    //从缓存中获取药物数据
    
    var today = util.formatTime(new Date());  //获得今天的日期
    var toolTodayDate=this.date1(today);        //分割今日的时间并返回 
    this.setData(                          //从plansIndex页面传过来的number
      {
        number:options.number,
        dateArray:toolPlan.dateArray,
        name:toolPlan.name,
        todayDate:toolTodayDate,
        timer:toolPlan.timer          //在page的data中设定服药计划中设定的服药时间数组
      }
    );

    if (!toolPlan.start){ //如果缓存中start值为假，则进行mqtt传输测试,这里是为了在机器上操作后没有在小程序上操作
      var that = this;
      that.data.client = app.globalData.client;
      // console.log(this.subscribeTopicConnect(toolPlan.name));
      that.data.client.subscribe(this.subscribeTopicConnect(toolPlan.name),function(err){if(!err){console.log('存药主题订阅成功')}})
      that.data.client.on('message',function(topic,message){      //监听mqtt消息
        console.log(message.toString())
        var exp=new RegExp('ok','g'); //设立正则表达式，匹配message中的ok字样
        if(exp.test(message.toString())) 
        {
          //若有存药，则将等待标志去除
          that.setData({
            showLoading:false,
            showAll:true
          })
          toolPlan.start=true;         //设定已经存药
          wx.setStorage({
            key:options.number.toString() ,
            data: toolPlan,
          });
        }
        
      });
      setTimeout(function(){
        if(!that.data.showAll)
        {
          that.setData({
          showLoading:false,
          showSaveHelp:true
          })
          // that.data.client.end();
        }
      },3000)
    }
    else{                                      //已经存药，进行服药的反馈监视
      var that = this;
      that.data.client = app.globalData.client;
      that.data.client.subscribe('Fankui1',function(err){if(!err){console.log('反馈主题订阅成功')}})
      that.data.client.on('message',function (topic,message) {
      var exp2=new RegExp('[0-9]{2}:[0-9]{2}:[0-9]{2}','g')
      var abc=exp2.exec(message.toString());
      console.log(abc)

      if(abc&&topic=='Fankui1'){
        // console.log('fuck',abc)
        var eatDrugTime=abc[0];  //eatdrugTime从本地发送过来的服药时间
        var diffResult=ifFeedBackOK(spereteTimerHourMinute(eatDrugTime),that.data.timer) //比较发送的时间和page中的timer确定时间段
        if(diffResult){       //如果当前时间比对成功 
          var currentTimeList=wx.getStorageSync('timeList'+that.data.number.toString());
          if(!currentTimeList){                        //若无此缓存则进行缓存的设置
            currentTimeList=setCache(that.data.timer,that.data.dateArray,that.data.number);
          }
          for(let i=0;i<currentTimeList.length;i++){        //则对缓存中的当前服药数组进行更改
            // console.log((that.date2(currentTimeList[i][0])).day)
            if(that.data.todayDate.day==(that.date2(currentTimeList[i][0])).day){
              currentTimeList[i][diffResult.index+1].time=eatDrugTime;
              diffResult.TorF?currentTimeList[i][diffResult.index+1].inTime=true:currentTimeList[i][diffResult.index+1].inTime=false;
              var showList=[]
              for(let j=1;j<=that.data.timer.length;j++){    //对显示数组循环赋值
                showList.push(currentTimeList[i][j])
              }
              wx.setStorageSync('timeList'+that.data.number.toString(), currentTimeList)
              break;
            }
          }
          that.setData({
            timerToShow:showList,
            feedbacktimeList:currentTimeList
          })
        }
        else{
          console.log('--------------！！！反馈时间错误！！！-------------')
        }
      }
      //that.data.client.end();//结束监听！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！
      })



      this.setData({
        showLoading: false,
        showAll: true
      })
    }
/** 
    var today = util.formatTime(new Date());  //获得今天的日期
    var toolTodayDate=this.date1(today);
    this.setData(                          //从plansIndex页面传过来的number
      {
        number:options.number,
        dateArray:toolPlan.dateArray,
        name:toolPlan.name,
        todayDate:toolTodayDate
      }
    );
    */
    this.scrollSteps();
  },



  subscribeTopicConnect:function(mName){                             //进行mqtt的topic的拼接
    return app.globalData.client_ID.toString()+'/plans/'+mName.toString()+'/save'
  },



  date1: function (today) {                        //对设定的日期数组进行分离
    var todayDate = {
      year: null,
      month: null,
      day: null,
      hour: null,
      minute: null
    }
    todayDate.year = parseInt(today.substring(0, 4));
    todayDate.month = parseInt(today.substring(5, 7));
    todayDate.day = parseInt(today.substring(8, 10));    
    todayDate.hour = parseInt(today.substring(11, 13));
    todayDate.minute = parseInt(today.substring(14, 17));
    return todayDate;
  },



  date2: function (today) {             //获取当天日期进行
    var todayDate = {
      year: null,
      month: null,
      day: null,
      hour: null,
      minute: null
    }
    todayDate.year = parseInt(today.substring(0, 4));
    todayDate.month = parseInt(today.substring(5, 7));
    todayDate.day = parseInt(today.substring(7, 9));
    todayDate.hour = parseInt(today.substring(11, 13));
    todayDate.minute = parseInt(today.substring(14, 17));
    return todayDate;
  },


})
/*
函数：
  ifFeedBack()
作用：
  比较发送的时间currentTime和设定的时间数组settedTimer的差值并返回结果
逻辑：
  与设定时间相差30min-------------返回true和数组的下标
  与设定时间相差大于30min小于2h----返回false和数组下标
  未找到-------------------------返回null
参数：
  currentTime-------------------当前时间        结构体
  settedTimer-------------------设定的时间数组   数 组
  */
function ifFeedBackOK(currentTime,settedTimer) {
  for(let i=0;i<settedTimer.length;i++){
    var diffTime=timeDiff(currentTime,spereteTimerHourMinute(settedTimer[i]))
    if(diffTime<=30&&diffTime>=0){
      return  {
        index:i,
        TorF:true
      }
    }
    else if(diffTime>=0&&diffTime<=120){
      return {
        index:i,
        TorF:false
      }
    }
  }
  return null
}


function spereteTimerHourMinute(time) {
  var returnTime={
    hour:null,
    minute:null
  }
  returnTime.hour=parseInt(time.substring(0,2));
  returnTime.minute=parseInt(time.substring(3,5))
  return returnTime;
}

function timeDiff(timeSetting,timeAccept) {
  return ((timeSetting.hour-timeAccept.hour)*60+(timeSetting.minute-timeAccept.minute))
}
/*
函数：
  setCache()
作用：
  设定缓存，键值为timeList+number，为二维数组，分别储存每天的当前服药时间
逻辑：
  将所有值均设为time:null,inTime:false
参数：
  timer-----------------------设定的时间数组   数 组
  dateArray-------------------设定的日期数组   数 组
  */
function setCache(timer,dateArray,number){
  var cacheArray=[];
  for(let i=0;i<dateArray.length;i++){
    var list=[];
    for(let j=0;j<timer.length+1;j++){
      if(j==0){
        list.push(dateArray[i])
      }
      var eatTimeStuct={
        time:null,
        inTime:false,
      }
      list.push(eatTimeStuct)
    }
    cacheArray.push(list);
  }
  console.log(cacheArray);
  wx.setStorageSync('timeList'+number.toString(), cacheArray);
  return cacheArray;
}