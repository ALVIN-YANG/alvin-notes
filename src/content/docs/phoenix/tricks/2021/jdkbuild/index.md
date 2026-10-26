---
{
  "title": "在容器中编译OpenJDK",
  "comments": false,
  "editUrl": false,
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "prev": {
    "link": "/phoenix/tricks/2021/",
    "label": "2021年文章集合"
  },
  "next": {
    "link": "/phoenix/tricks/2021/k3s/",
    "label": "Into Kubernetes"
  }
}
---
## 编译环境



## 按需编译





## 裁剪





## Alpine Musl

```
sh ./configure --with-jvm-variants=server \
--with-boot-jdk=$BOOT_JDK \
--with-build-jdk=$BUILD_JDK \
--openjdk-target=x86_64-unknown-linux-musl \
--with-devkit=$DEVKIT \
--with-sysroot=$SYSROOT
```