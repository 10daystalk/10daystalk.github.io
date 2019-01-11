---
title: Android检测主线程阻塞（ANR）
layout: post

categories: post
tags:
- Android
- ANR
- Performance
---
不能在主线程执行耗时操作，已是过去、现在和未来Android开发者必须遵循的一个原则。解决此问题常用的工具有AsyncTask，HandlerThread，RxJava等等。但在业务复杂的场景中，或者是维护已有代码时，我们很难保证所有复杂任务全是异步执行。

倘若现在我们遇到一个ANR的问题，但我们很难分析代码来定位到是哪个方法导致ANR。那么有没有什么机制可以知道主线程各个操作的耗时，从而知道各个操作是否会引起ANR呢？

### Handler、Looper、MeesageQueue与Message 
主线程的调度其实就是一个Looper模型：

<img src="/static/images/main_thread_block_01.png" height="446" width="489" class="float-top"/>

了解Looper模型我们就知道，主线程的任务其实就是各种Message。Message的处理是由Looper来负责的，通过阅读Looper的源码可以发现，在每个Message处理之前和处理完成之后，都会通过一个Printer打印一条记录。下面的代码片段可以在Looper.loop()方法中找到。

处理之前：
```
final Printer logging = me.mLogging;
if (logging != null) {
            logging.println(">>>>> Dispatching to " + msg.target + " " +
            msg.callback + ": " + msg.what);
}
```
处理完成后：
```
if (logging != null) {
            logging.println("<<<<< Finished to " + msg.target + " " + msg.callback);
}
```
这样，我们可以通过抓取这些log来分析一条Message处理的时间。从而分析出是否时间过长，是否产生了ANR。

### setMessageLogging
那么，我们可以通过Looper的setMessageLogging为其设一个Printer。这样Message的执行我们就能抓取到了。

### 实现代码
```
class MainThreadBlockDetectorActivity : AppCompatActivity(), Printer {
    companion object {
        private const val TAG = "MainThreadBlockDetector"
    }

    private lateinit var logText: TextView

    /**
     * 达到多少时间才算block
     */
    private val blockTimeThresholds: Long = 1000

    private var monitoring = false

    /**
     * 记录上一次处理开始时间
     */
    private var lastStartDispatchToHandlerTime: Long = 0
    /**
     * 记录上一次处理完成时间
     */
    private var lastFinishedDispatchToHandlerTime: Long = 0
    /**
     * 上一次抓取到的log
     */
    private var lastDispatchLog: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main_thread_block)

        startBlockMonitor()
        logText = findViewById(R.id.log_text)
        logText.text = "block log:\n"
        findViewById<View>(R.id.btn_block).setOnClickListener {
            logText.postDelayed({
                try {
                    Thread.sleep(5000)
                } catch (e: java.lang.Exception) {
                    // ignore
                }
            }, 3000)
        }
    }

    override fun onDestroy() {
        super.onDestroy()

        stopBlockMonitor()
    }

    private fun startBlockMonitor() {
        if (!monitoring) {
            monitoring = true
            Looper.getMainLooper().setMessageLogging(this)
        }
    }

    private fun stopBlockMonitor() {
        if (monitoring) {
            monitoring = false
            Looper.getMainLooper().setMessageLogging(null)
        }
    }

    override fun println(x: String?) {
        if (!monitoring) {
            return
        }

        doHandleLog(x)
    }

    private fun doHandleLog(x: String?) {
        Log.d(TAG, "doHandleLog: $x")
        x?.apply {
            val now = System.currentTimeMillis()

            // 根据符号判断是处理开始还是处理完成
            val beforeHandle = startsWith(">>>>")

            if (beforeHandle) {
                if (lastStartDispatchToHandlerTime < 0) {
                    lastStartDispatchToHandlerTime = now
                    return
                }
            } else {
                if (lastFinishedDispatchToHandlerTime < 0) {
                    lastFinishedDispatchToHandlerTime = now
                    return
                }
            }

            if (!beforeHandle) {
                // 只care处理完之后和处理之前的时间差
                beforeHandler(now)
            } else {
                lastStartDispatchToHandlerTime = now
                lastDispatchLog = this
            }
        }

    }

    private fun beforeHandler(now: Long) {
        if (now - lastStartDispatchToHandlerTime > blockTimeThresholds) {

            val messageInfo = getMessageDetail(lastDispatchLog)

            if (messageInfo == null) {
                Log.e(TAG, "getMessageDetail is null")
                return
            }

            if (!messageInfo.mIsSuccess) {
                Log.e(TAG, "getMessageDetail is not parsed successful")
                return
            }

            val handlerClassName = messageInfo.handlerClassName
            val msgRunnable = messageInfo.msgRunnable
            val msgWhat = messageInfo.msgWhat

            logText.append(
                "block time: " + (System.currentTimeMillis() - lastStartDispatchToHandlerTime)
                        + ", handler: " + handlerClassName + ", callback: " + msgRunnable
                        + ", what: " + msgWhat + "\n"
            )
            Log.d(
                TAG,
                "block time: " + (System.currentTimeMillis() - lastStartDispatchToHandlerTime)
                        + ", handler: " + handlerClassName + ", callback: " + msgRunnable
                        + ", what: " + msgWhat
            )

            // block event
            // 1. report
            // 2. get back trace for the stacks.
            lastFinishedDispatchToHandlerTime = now

            logText.append(
                "currentTime = $now , blockTime = ${now - lastStartDispatchToHandlerTime} ," +
                        " handlerClassName = $handlerClassName , msgRunnable = $msgRunnable , msgWhat = $msgWhat" + "\n"
            )
            Log.e(
                TAG,
                "currentTime = $now , blockTime = ${now - lastStartDispatchToHandlerTime} ," +
                        " handlerClassName = $handlerClassName , msgRunnable = $msgRunnable , msgWhat = $msgWhat"
            )
        }
    }

    /**
     * 解析抓取到到log，来判断消息相关信息，从而定位block位置
     */
    private fun getMessageDetail(lastDispatchLog: String?): MessageInfo? {
        val messageInfo = MessageInfo()

        if (!TextUtils.isEmpty(lastDispatchLog)) {
            // ">>>>> Dispatching to Handler (c.t.m.g.cw$a) {7f30766} null: 3999"
            val afterString = lastDispatchLog!!.substring(">>>>> Dispatching to Handler ".length)

            if (!TextUtils.isEmpty(afterString)) {

                val indexOfLeftBracket = afterString.indexOf('(')

                if (indexOfLeftBracket < 0) {
                    return null
                }

                val indexOfRightBracket = afterString.indexOf(')')

                if (indexOfRightBracket < 0) {
                    Log.e(TAG, Throwable().message)
                    return null
                }

                val indexOfRightBrace = afterString.indexOf('}')

                if (indexOfRightBrace < 0) {
                    Log.e(TAG, Throwable().message)
                    return null
                }


                val indexOfComma = afterString.indexOf(':')
                if (indexOfComma < 0) {
                    Log.e(TAG, indexOfComma.toString(), Throwable())
                    return null
                }

                try {
                    messageInfo.handlerClassName =
                            afterString.substring(indexOfLeftBracket + 1, indexOfRightBracket).trim { it <= ' ' }
                } catch (e: Exception) {
                    messageInfo.mIsSuccess = false
                    e.printStackTrace()
                }

                try {
                    messageInfo.msgRunnable = afterString
                        .substring(indexOfRightBrace + 1, indexOfComma).trim { it <= ' ' }
                } catch (e: Exception) {
                    messageInfo.mIsSuccess = false
                    e.printStackTrace()

                }

                try {
                    messageInfo.msgWhat = afterString.substring(indexOfComma + 1).trim { it <= ' ' }
                } catch (e: Exception) {
                    messageInfo.mIsSuccess = false
                    e.printStackTrace()
                }

            }
        }
        return messageInfo
    }

    private class MessageInfo {
        internal var handlerClassName = ""
        internal var msgRunnable = ""
        internal var msgWhat = ""
        internal var mIsSuccess = true
    }
}
```
