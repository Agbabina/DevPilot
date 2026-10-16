package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var syncingOutbox bool

type queuedRequest struct {
	Method   string          `json:"method"`
	Path     string          `json:"path"`
	Body     json.RawMessage `json:"body,omitempty"`
	QueuedAt time.Time       `json:"queuedAt"`
}

func outboxPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil || strings.TrimSpace(home) == "" {
		return "", errors.New("cannot locate your home directory for the offline queue")
	}
	dir := filepath.Join(home, ".devpilot")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "outbox.json"), nil
}

func isQueueableMutation(method, path string) bool {
	method = strings.ToUpper(method)
	if method != "POST" && method != "PUT" && method != "PATCH" && method != "DELETE" {
		return false
	}
	return !strings.HasPrefix(path, "/auth/") && !strings.HasPrefix(path, "/ai/")
}

func readOutbox(path string) ([]queuedRequest, error) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return []queuedRequest{}, nil
	}
	if err != nil {
		return nil, err
	}
	var queue []queuedRequest
	if len(data) == 0 {
		return []queuedRequest{}, nil
	}
	if err := json.Unmarshal(data, &queue); err != nil {
		return nil, fmt.Errorf("offline queue is invalid JSON: %w", err)
	}
	return queue, nil
}

func writeOutbox(path string, queue []queuedRequest) error {
	data, err := json.MarshalIndent(queue, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

func queueOfflineRequest(method, path string, body any) error {
	file, err := outboxPath()
	if err != nil {
		return err
	}
	queue, err := readOutbox(file)
	if err != nil {
		return err
	}
	var payload json.RawMessage
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return err
		}
		payload = encoded
	}
	queue = append(queue, queuedRequest{
		Method: strings.ToUpper(method),
		Path: path,
		Body: payload,
		QueuedAt: time.Now().UTC(),
	})
	return writeOutbox(file, queue)
}

func syncOutbox() {
	if config.Token == "" {
		fmt.Println("Log in first with devpilot login before syncing queued changes.")
		return
	}
	file, err := outboxPath()
	if err != nil {
		fmt.Println("Cannot access offline queue:", err)
		return
	}
	queue, err := readOutbox(file)
	if err != nil {
		fmt.Println("Cannot read offline queue:", err)
		return
	}
	if len(queue) == 0 {
		fmt.Println("Everything is synced. No queued changes.")
		return
	}

	fmt.Printf("Syncing %d queued change(s)...
", len(queue))
	syncingOutbox = true
	defer func() { syncingOutbox = false }()
	completed := 0
	for completed < len(queue) {
		item := queue[completed]
		var body any
		if len(item.Body) > 0 {
			if err := json.Unmarshal(item.Body, &body); err != nil {
				fmt.Printf("Stopped at queued change %d: invalid saved payload: %v
", completed+1, err)
				break
			}
		}
		if err := request(item.Method, item.Path, body, nil); err != nil {
			fmt.Printf("Stopped at queued change %d (%s %s): %v
", completed+1, item.Method, item.Path, err)
			break
		}
		completed++
		if err := writeOutbox(file, queue[completed:]); err != nil {
			fmt.Println("Change synced, but could not update the local queue:", err)
			return
		}
		queue = queue[completed:]
		completed = 0
	}
	remaining, readErr := readOutbox(file)
	if readErr != nil {
		fmt.Println("Synced some changes, but could not reread the queue:", readErr)
		return
	}
	if len(remaining) == 0 {
		fmt.Println("Sync complete. All queued changes were sent.")
	} else {
		fmt.Printf("Sync paused. %d change(s) remain queued; fix the reported issue and run devpilot sync again.
", len(remaining))
	}
}
