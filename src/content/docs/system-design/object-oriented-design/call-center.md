---
{
  "title": "设计呼叫中心",
  "sidebar": {
    "order": 19
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/object-oriented-design/lru-cache/",
    "label": "设计 LRU 缓存"
  },
  "next": {
    "link": "/system-design/object-oriented-design/deck-of-cards/",
    "label": "设计一副牌"
  }
}
---
本 Notebook 由 [Donne Martin](https://github.com/donnemartin) 编写。源码和许可信息见 [GitHub](https://github.com/donnemartin/system-design-primer)。

## 约束与假设

* 呼叫中心有哪些级别的员工？
    * 接线员、主管、总监
* 是否可以假设来电总是先由接线员接听？
    * 可以
* 如果没有空闲的接线员，或者接线员无法处理来电，是否将来电转给主管？
    * 是
* 如果没有空闲的主管，或者主管无法处理来电，是否将来电转给总监？
    * 是
* 是否可以假设总监能够处理所有来电？
    * 可以
* 如果没有人能够接听来电，会怎样？
    * 来电进入队列
* 是否需要把 VIP 来电放到队列前面？
    * 不需要
* 是否可以假设输入有效，还是必须进行校验？
    * 假设输入有效

## 解答

```python
%%writefile call_center.py
from abc import ABCMeta, abstractmethod
from collections import deque
from enum import Enum


class Rank(Enum):

    OPERATOR = 0
    SUPERVISOR = 1
    DIRECTOR = 2


class Employee(metaclass=ABCMeta):

    def __init__(self, employee_id, name, rank, call_center):
        self.employee_id = employee_id
        self.name = name
        self.rank = rank
        self.call = None
        self.call_center = call_center

    def take_call(self, call):
        """Assume the employee will always successfully take the call."""
        self.call = call
        self.call.employee = self
        self.call.state = CallState.IN_PROGRESS

    def complete_call(self):
        self.call.state = CallState.COMPLETE
        self.call_center.notify_call_completed(self.call)

    @abstractmethod
    def escalate_call(self):
        pass

    def _escalate_call(self):
        self.call.state = CallState.READY
        call = self.call
        self.call = None
        self.call_center.notify_call_escalated(call)


class Operator(Employee):

    def __init__(self, employee_id, name):
        super(Operator, self).__init__(employee_id, name, Rank.OPERATOR)

    def escalate_call(self):
        self.call.level = Rank.SUPERVISOR
        self._escalate_call()


class Supervisor(Employee):

    def __init__(self, employee_id, name):
        super(Operator, self).__init__(employee_id, name, Rank.SUPERVISOR)

    def escalate_call(self):
        self.call.level = Rank.DIRECTOR
        self._escalate_call()


class Director(Employee):

    def __init__(self, employee_id, name):
        super(Operator, self).__init__(employee_id, name, Rank.DIRECTOR)

    def escalate_call(self):
        raise NotImplemented('Directors must be able to handle any call')


class CallState(Enum):

    READY = 0
    IN_PROGRESS = 1
    COMPLETE = 2


class Call(object):

    def __init__(self, rank):
        self.state = CallState.READY
        self.rank = rank
        self.employee = None


class CallCenter(object):

    def __init__(self, operators, supervisors, directors):
        self.operators = operators
        self.supervisors = supervisors
        self.directors = directors
        self.queued_calls = deque()

    def dispatch_call(self, call):
        if call.rank not in (Rank.OPERATOR, Rank.SUPERVISOR, Rank.DIRECTOR):
            raise ValueError('Invalid call rank: {}'.format(call.rank))
        employee = None
        if call.rank == Rank.OPERATOR:
            employee = self._dispatch_call(call, self.operators)
        if call.rank == Rank.SUPERVISOR or employee is None:
            employee = self._dispatch_call(call, self.supervisors)
        if call.rank == Rank.DIRECTOR or employee is None:
            employee = self._dispatch_call(call, self.directors)
        if employee is None:
            self.queued_calls.append(call)

    def _dispatch_call(self, call, employees):
        for employee in employees:
            if employee.call is None:
                employee.take_call(call)
                return employee
        return None

    def notify_call_escalated(self, call):  # ...
    def notify_call_completed(self, call):  # ...
    def dispatch_queued_call_to_newly_freed_employee(self, call, employee):  # ...
```

### 原 Notebook 输出

```text
Overwriting call_center.py

```
