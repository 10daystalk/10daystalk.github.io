---
title: Android检测主线程阻塞（ANR）
layout: post

categories: post
tags:
- Android
- ANR
- Performance
---
不能在主线程执行耗时操作，已是过去，现在和未来Android开发者必须遵循的一个原则。解决此问题常用的工具有AsyncTask，HandlerThread，RxJava等等。但在业务复杂的场景中，或者是维护已有代码时，我们很难保证所有复杂任务全是异步执行。

倘若现在我们遇到一个ANR的问题，但我们很难分析代码来定位到是哪个方法导致ANR。那么有没有什么机制可以知道主线程各个操作的耗时，从而知道各个操作是否会引起ANR呢？

### Handler、Looper、MeesageQueue与Message 
主线程的调度其实就是一个Looper模型：

<img src="/static/images/main_thread_block_01.png" height="446" width="489" class="float-top"/>

了解Looper模型我们就知道，主线程的任务其实就是各种Message。Message的处理是由Looper来负责的，通过阅读Looper的源码可以发现，在每个Message处理之前和处理完成之后，都会通过一个Printer打印一条记录。
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
