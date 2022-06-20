namespace "TestNamespace"

interface {
  testOperation(arg1: string, arg2: bytes): Response
}

type Response {
  output: Message
}

type Message {
  value: string
}