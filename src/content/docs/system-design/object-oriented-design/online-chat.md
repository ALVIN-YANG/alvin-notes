---
{
  "title": "设计在线聊天服务",
  "sidebar": {
    "order": 22
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/object-oriented-design/parking-lot/",
    "label": "设计停车场"
  },
  "next": {
    "link": "/system-design/getting-started/",
    "label": "系统设计主题：从这里开始"
  }
}
---
本 Notebook 由 [Donne Martin](https://github.com/donnemartin) 编写。源码和许可信息见 [GitHub](https://github.com/donnemartin/system-design-primer)。

## 约束与假设

* 假设重点实现以下流程：
    * 只支持文字聊天
    * 用户
        * 添加用户
        * 删除用户
        * 更新用户
        * 向用户的好友列表中添加好友
            * 添加好友请求
                * 接受好友请求
                * 拒绝好友请求
        * 从用户的好友列表中移除好友
    * 创建群聊
        * 邀请好友加入群聊
        * 向群聊发送消息
    * 一对一私聊
        * 邀请好友进行私聊
        * 向私聊发送消息
* 初期不需要考虑扩展性

## 解答

```python
%%writefile online_chat.py
from abc import ABCMeta


class UserService(object):

    def __init__(self):
        self.users_by_id = {}  # key: user id, value: User

    def add_user(self, user_id, name, pass_hash):  # ...
    def remove_user(self, user_id):  # ...
    def add_friend_request(self, from_user_id, to_user_id):  # ...
    def approve_friend_request(self, from_user_id, to_user_id):  # ...
    def reject_friend_request(self, from_user_id, to_user_id):  # ...


class User(object):

    def __init__(self, user_id, name, pass_hash):
        self.user_id = user_id
        self.name = name
        self.pass_hash = pass_hash
        self.friends_by_id = {}  # key: friend id, value: User
        self.friend_ids_to_private_chats = {}  # key: friend id, value: private chats
        self.group_chats_by_id = {}  # key: chat id, value: GroupChat
        self.received_friend_requests_by_friend_id = {}  # key: friend id, value: AddRequest
        self.sent_friend_requests_by_friend_id = {}  # key: friend id, value: AddRequest

    def message_user(self, friend_id, message):  # ...
    def message_group(self, group_id, message):  # ...
    def send_friend_request(self, friend_id):  # ...
    def receive_friend_request(self, friend_id):  # ...
    def approve_friend_request(self, friend_id):  # ...
    def reject_friend_request(self, friend_id):  # ...


class Chat(metaclass=ABCMeta):

    def __init__(self, chat_id):
        self.chat_id = chat_id
        self.users = []
        self.messages = []


class PrivateChat(Chat):

    def __init__(self, first_user, second_user):
        super(PrivateChat, self).__init__()
        self.users.append(first_user)
        self.users.append(second_user)


class GroupChat(Chat):

    def add_user(self, user):  # ...
    def remove_user(self, user):  # ... 


class Message(object):

    def __init__(self, message_id, message, timestamp):
        self.message_id = message_id
        self.message = message
        self.timestamp = timestamp


class AddRequest(object):

    def __init__(self, from_user_id, to_user_id, request_status, timestamp):
        self.from_user_id = from_user_id
        self.to_user_id = to_user_id
        self.request_status = request_status
        self.timestamp = timestamp


class RequestStatus(Enum):

    UNREAD = 0
    READ = 1
    ACCEPTED = 2
    REJECTED = 3
```

### 原 Notebook 输出

```text
Overwriting online_chat.py

```
