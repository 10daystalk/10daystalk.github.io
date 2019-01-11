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

