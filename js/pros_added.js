function loadTwoLine() {
    var myChart = echarts.init(document.getElementById('container'));
    // 显示标题，图例和空的坐标轴
    myChart.setOption({
        title: {
            text: '七省新增确诊病例'
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['河南省', '江苏省', '江西省', '湖南省', '安徽省', '广东省', '浙江省']
        },
        toolbox: {
            show: true,
            feature: {
                //mark: { show: true },
                //dataView: { show: true, readOnly: false },
                //magicType: { show: true, type: ['line', 'bar'] },
                //restore: { show: true },
                saveAsImage: { show: true }
            }
        },
        calculable: true,
        xAxis: {
            type: 'category',
            boundaryGap: true, //取消左侧的间距
            axisLabel: {rotate: 50, interval: 1}
            data: []
        },
        yAxis: {
            type: 'value',
            splitLine: { show: true },//去除网格线
            name: ''
        },
        series: [{
            name: '河南省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,//设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        },{
            name: '江苏省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,//设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        },{
            name: '江西省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,    //设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        },{
            name: '湖南省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,    //设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        },{
            name: '安徽省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,    //设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        },{
            name: '广东省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,    //设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        },{
            name: '浙江省',
            type: 'line',
            symbol: 'circle',
            symbolSize: 10,    //设置折线图中表示每个坐标点的符号 emptycircle：空心圆；emptyrect：空心矩形；circle：实心圆；emptydiamond：菱形
            data: []
        }]
    });
    myChart.showLoading();    //数据加载完之前先显示一段简单的loading动画
    var names = [];    //类别数组（实际用来盛放X轴坐标值）    
    var series1 = [];
    var series2 = [];
    var series3 = [];
    var series4 = [];
    var series5 = [];
    var series6 = [];
    var series7 = [];
    $.ajax({
        type: 'get',
        url: '/json/pros_info.json',//请求数据的地址
        dataType: "json",        //返回数据形式为json
        success: function (result) {
            //请求成功时执行该函数内容，result即为服务器返回的json对象           
            $.each(result.henan, function (index, item) {
                names.push(item.date);    //挨个取出类别并填入类别数组
                series1.push(item.added);
            });
            $.each(result.jiangsu, function (index, item) {
                series2.push(item.added);
            });
            $.each(result.jiangxi, function (index, item) {
                series3.push(item.added);
            });
            $.each(result.hunan, function (index, item) {
                series4.push(item.added);
            });
            $.each(result.anhui, function (index, item) {
                series5.push(item.added);
            });
            $.each(result.guangdong, function (index, item) {
                series6.push(item.added);
            });
            $.each(result.zhejiang, function (index, item) {
                series7.push(item.added);
            });
            myChart.hideLoading();    //隐藏加载动画
            myChart.setOption({        //加载数据图表
                xAxis: {
                    data: names
                },
                series: [{                    
                    data: series1
                },
                {
                    data: series2
                },
                {
                    data: series3
                },{
                    data: series4
                },{
                    data: series5
                },{
                    data: series6
                },{
                    data: series7
                }]
            });
        },
        error: function (errorMsg) {
            //请求失败时执行该函数
            alert("图表请求数据失败!");
            myChart.hideLoading();
        }
    });
};
loadTwoLine();
        myChart.setOption(option);
