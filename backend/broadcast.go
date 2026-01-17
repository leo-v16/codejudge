package main

import (
	"encoding/json"
	"fmt"
	"sync"
)

type LeaderboardBroker struct {
	// Map contestID -> list of client channels
	Clients map[uint][]chan string
	Lock    sync.Mutex
}

var Broker *LeaderboardBroker

func InitBroker() {
	Broker = &LeaderboardBroker{
		Clients: make(map[uint][]chan string),
	}
}

func (b *LeaderboardBroker) Subscribe(contestID uint) chan string {
	b.Lock.Lock()
	defer b.Lock.Unlock()

	ch := make(chan string, 5) // Buffer slightly
	b.Clients[contestID] = append(b.Clients[contestID], ch)
	return ch
}

func (b *LeaderboardBroker) Unsubscribe(contestID uint, ch chan string) {
	b.Lock.Lock()
	defer b.Lock.Unlock()

	clients := b.Clients[contestID]
	for i, client := range clients {
		if client == ch {
			b.Clients[contestID] = append(clients[:i], clients[i+1:]...)
			close(ch)
			break
		}
	}
}

func (b *LeaderboardBroker) Broadcast(contestID uint, data interface{}) {
	b.Lock.Lock()
	defer b.Lock.Unlock()

	jsonData, err := json.Marshal(data)
	if err != nil {
		fmt.Println("Error marshalling broadcast data:", err)
		return
	}
	
	msg := string(jsonData)

	for _, ch := range b.Clients[contestID] {
		select {
		case ch <- msg:
		default:
			// Client channel full, skip or drop
		}
	}
}
