package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

type pythonOptimizerResponse struct {
	Success   bool   `json:"success"`
	Changed   bool   `json:"changed"`
	MimeType  string `json:"mime_type"`
	Extension string `json:"extension"`
	Error     string `json:"error"`
}

func getPythonOptimizerScriptPath() string {
	if custom := strings.TrimSpace(os.Getenv("PYTHON_OPTIMIZER_SCRIPT")); custom != "" {
		return custom
	}

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return filepath.Join("handlers", "image_optimizer.py")
	}

	// backend\utils\python_optimizer.go -> backend\handlers\image_optimizer.py
	return filepath.Join(filepath.Dir(currentFile), "..", "handlers", "image_optimizer.py")
}

func runPythonCommand(scriptPath string, args ...string) ([]byte, []byte, error) {
	if pyBin := strings.TrimSpace(os.Getenv("PYTHON_BIN")); pyBin != "" {
		cmd := exec.Command(pyBin, append([]string{scriptPath}, args...)...)
		out, err := cmd.Output()
		if err != nil {
			if ee, ok := err.(*exec.ExitError); ok {
				return out, ee.Stderr, err
			}
			return out, nil, err
		}
		return out, nil, nil
	}

	candidates := []struct {
		bin  string
		args []string
	}{
		{bin: "python", args: []string{}},
		{bin: "py", args: []string{"-3"}},
	}

	var lastErr error
	var lastStderr []byte
	for _, c := range candidates {
		callArgs := append(c.args, scriptPath)
		callArgs = append(callArgs, args...)

		cmd := exec.Command(c.bin, callArgs...)
		out, err := cmd.Output()
		if err == nil {
			return out, nil, nil
		}

		lastErr = err
		if ee, ok := err.(*exec.ExitError); ok {
			lastStderr = ee.Stderr
		}
	}

	return nil, lastStderr, lastErr
}

// OptimizeFileWithPython mengirim file ke optimizer Python.
// Jika optimizer gagal, caller sebaiknya fallback ke file original.
func OptimizeFileWithPython(fileBytes []byte, detectedMime, ext string, maxWidth, quality int) ([]byte, string, string, bool, error) {
	if len(fileBytes) == 0 {
		return fileBytes, detectedMime, ext, false, nil
	}

	if ext == "" {
		ext = ".bin"
	}

	tmpDir, err := os.MkdirTemp("", "nf-upload-opt-*")
	if err != nil {
		return nil, "", "", false, fmt.Errorf("gagal membuat temp dir optimizer: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	inputPath := filepath.Join(tmpDir, "input"+ext)
	outputPath := filepath.Join(tmpDir, "output"+ext)

	if err := os.WriteFile(inputPath, fileBytes, 0o600); err != nil {
		return nil, "", "", false, fmt.Errorf("gagal menulis input optimizer: %w", err)
	}

	scriptPath := getPythonOptimizerScriptPath()
	out, stderr, err := runPythonCommand(
		scriptPath,
		"--input", inputPath,
		"--output", outputPath,
		"--mime", detectedMime,
		"--ext", ext,
		"--max-width", strconv.Itoa(maxWidth),
		"--quality", strconv.Itoa(quality),
	)
	if err != nil {
		if len(stderr) > 0 {
			return nil, "", "", false, fmt.Errorf("optimizer python gagal: %v (%s)", err, strings.TrimSpace(string(stderr)))
		}
		return nil, "", "", false, fmt.Errorf("optimizer python gagal: %w", err)
	}

	var resp pythonOptimizerResponse
	if err := json.Unmarshal(out, &resp); err != nil {
		return nil, "", "", false, fmt.Errorf("output optimizer python invalid: %w", err)
	}
	if !resp.Success {
		if resp.Error == "" {
			resp.Error = "unknown python optimizer error"
		}
		return nil, "", "", false, errors.New(resp.Error)
	}

	optimizedBytes, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, "", "", false, fmt.Errorf("gagal membaca output optimizer: %w", err)
	}

	resultMime := detectedMime
	if strings.TrimSpace(resp.MimeType) != "" {
		resultMime = strings.TrimSpace(resp.MimeType)
	}

	resultExt := ext
	if strings.TrimSpace(resp.Extension) != "" {
		resultExt = strings.ToLower(strings.TrimSpace(resp.Extension))
		if !strings.HasPrefix(resultExt, ".") {
			resultExt = "." + resultExt
		}
	}

	changed := resp.Changed && len(optimizedBytes) > 0 && len(optimizedBytes) < len(fileBytes)
	if !changed {
		return fileBytes, detectedMime, ext, false, nil
	}

	return optimizedBytes, resultMime, resultExt, true, nil
}
