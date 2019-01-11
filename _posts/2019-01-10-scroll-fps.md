---
title: Android统计列表滑动帧率
layout: post

categories: post
tags:
- Android
- RecyclerView
- Performance
---
我们的日常项目中，免不了接触各种各样的列表。从简单样式的联系人列表，到复杂的Feed流。列表的优化不再局限于以往的ListView优化，也就是说使用仅仅ViewHolder机制已不能够保证开发一个流畅的列表了。像Feed流的场景，列表中充斥着各种各样的图片、自定义控件、音视频播放调度、手势触控、消息传递等等，需要做太多太多的事情了。此时如何能保证Feed流的平滑滑动就变得相当重要！而流畅的衡量标准就是帧率，即fps。这篇文章主要介绍统计列表滑动帧率的方法。

### 统计原理
<img src="/static/images/fps_01.png" height="240" width="210" class="float-top"/>

当某一事件触发时，我们开始记录下系统绘制的帧数。事件结束或者到达一定时长时，停止记录。此时 帧率 = 帧数 / (start - end)。

有几个因素会影响统计精度：
* 统计时长，丢帧通常发生在某一小段时间，此时间段内或应用执行的任务较多。那么统计过长会稀释掉小段时间的丢帧
* 时间单位，通常将开始时间和结束时间精确到纳秒进行计算。

因此在列表滑动的场景，列表开始滑动可以作为起始点。列表停止滑动或者滑动到达一定时间可以作为结束点。计算出此时的fps，即可作为列表滑动的fps。那么应该如何统计帧数呢？

### android.view.Choreographer类获取帧回调
Choreographer是用来协调输入、动画的时间。有兴趣的读者可以深入了解。它有一个postFrameCallback的方法，传入一个FrameCalback对象。渲染下一帧，则会回调FrameCallback的doFrame。回调后这个callback就失效了，需要再重新设置下一帧的回调。

我们可以在统计开始时为它设置FrameCallback回调。在每一帧的doFrame回调中，记录帧数，并设置下一帧的回调。统计结束后，就不再设置下一帧回调了。

这样我们就拿到了前面的三个参数，帧数、起始时间、结束时间。就可以计算出这段时间的fps了。

### 代码
```
class MainActivity : AppCompatActivity(), Choreographer.FrameCallback {

    companion object {
        private const val TAG = "MainActivity"
        private const val SECOND_NANO_SECOND_FACTOR = 1000.0 * 1000.0 * 1000.0
        private const val SCROLL_PIXEL_THRESHOLD = 700
    }

    // 是否正在检测fps中
    private var isFpsDetecting = false
    // 统计帧数
    private var frameCount = 0
    // 起始时间纳秒
    private var startDetectTimeNano = 0L
    // 结束统计时间纳秒
    private var stopDetectTimeNano = 0L

    // 滑动的距离，如果距离太短，则不统计。也可以禁用掉距离判断
    private var scrollTotalPixels = 0

    private var frameScrollListener = object : RecyclerView.OnScrollListener() {
        override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
            super.onScrolled(recyclerView, dx, dy)
            // 累加具体，这里简单处理。
            scrollTotalPixels += dy
        }

        override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
            super.onScrollStateChanged(recyclerView, newState)
            if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
                // 开始滑动并且没有开始统计，则开始统计
                if (!isFpsDetecting) {
                    Choreographer.getInstance().postFrameCallback(this@MainActivity)
                    isFpsDetecting = true
                    frameCount = 0
                    scrollTotalPixels = 0
                    startDetectTimeNano = System.nanoTime()
                    stopDetectTimeNano = startDetectTimeNano
                }

            } else if (newState == RecyclerView.SCROLL_STATE_IDLE) {
                stopDetectTimeNano = System.nanoTime()
                isFpsDetecting = false

                if (Math.abs(scrollTotalPixels) > SCROLL_PIXEL_THRESHOLD) {
                    val fps = computeFrameRate()
                    Log.d(TAG, "Fps = $fps")
                }
                frameCount = 0
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val recyclerView = findViewById<RecyclerView>(R.id.item_list)
        recyclerView.addOnScrollListener(frameScrollListener)
        recyclerView.adapter = ItemAdapter()
    }
    
     /**
     * 计算fps
     */
    private fun computeFrameRate(): Double {
        val timeDuration = stopDetectTimeNano - startDetectTimeNano
        return if (timeDuration != 0L) {
            val periodSecond = timeDuration / SECOND_NANO_SECOND_FACTOR
            frameCount / periodSecond
        } else {
            // unlikely
            0.0
        }
    }

    override fun doFrame(frameTimeNanos: Long) {
        frameCount++
        if (isFpsDetecting) {
            Choreographer.getInstance().postFrameCallback(this)
        }
    }


    private class ItemViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        var itemName: TextView = itemView.findViewById(R.id.item_name)
    }

    private class ItemAdapter : RecyclerView.Adapter<ItemViewHolder>() {
        override fun onCreateViewHolder(parent: ViewGroup, position: Int): ItemViewHolder {
            return ItemViewHolder(LayoutInflater.from(parent.context).inflate(R.layout.layout_item, parent, false))
        }

        override fun getItemCount() = 100

        override fun onBindViewHolder(holder: ItemViewHolder, position: Int) {
            holder.itemName.text = position.toString()
        }

    }


}
```
