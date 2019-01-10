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
