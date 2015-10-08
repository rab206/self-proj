from twisted.python import log
from twisted.internet import reactor
from autobahn.twisted.websocket import WebSocketServerProtocol, \
    WebSocketServerFactory


class MyServerProtocol(WebSocketServerProtocol):
    def connectionMade(self):
        print 'connection made'
        WebSocketServerProtocol.connectionMade(self)
  
    def onOpen(self):
        WebSocketServerProtocol.onOpen(self)
        self.factory.register(self)
        print 'Connection opened to', self.peerstr
  
    def sendFSEvent(self, json):
        WebSocketProtocol.sendMessage(self, json)
        print 'to', self.peerstr
  
    def onClose(self, wasClean, code, reason):
        print 'closed', self.peerstr
        WebSocketServerProtocol.onClose(self, wasClean,
                                        code, reason)
        self.factory.unregister(self)

class ServerFactory(WebSocketServerFactory):
    protocol = MyServerProtocol
  
    def __init__(self, url='ws://localhost', port=9000):
        addr = url + ':' + str(port)
        print 'listening on', addr
        WebSocketServerFactory.__init__(self, addr)
        self.clients = []
  
    def register(self, client):
        if not client in self.clients:
            print 'registered client', client.peerstr
            self.clients.append(client)
  
    def unregister(self, client):
        if client in self.clients:
            print 'unregistered client', client.peerstr
            self.clients.remove(client)
        self._printConnected()
  
    def _printConnected(self):
        print 'connected clients:[',
        for client in self.clients:
            print client.peerstr + ',',
        print ']'
  
    # broadcasts a json msg to all clients
    def notify_clients(self, message):
        print 'broadcasting ', message
        for c in self.clients:
            c.sendFSEvent(message)
        
class WebSocket:

    def __init__(self):
        
        print("Initializing WebSocket")
        factory = WebSocketServerFactory(u"ws://localhost:9000", debug=False)
        factory.protocol = MyServerProtocol
        # factory.setProtocolOptions(maxConnections=2)
        self.factory = factory
              
        reactor.listenWS(factory)
        reactor.run()
        print("Initialization of WebSocket completed.")
    
    def sendMessage(self, text):
        payload = text.encode('utf8')
        self.factory.notify_clients(payload, isBinary = False)