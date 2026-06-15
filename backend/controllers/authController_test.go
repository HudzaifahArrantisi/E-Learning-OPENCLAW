package controllers

import "testing"

func TestNormalizeLoginIdentifier(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "NIM", input: "2310112345", want: "2310112345"},
		{name: "NIP", input: "1987654321", want: "1987654321"},
		{name: "username", input: "bem-sttnf", want: "bem-sttnf"},
		{name: "institutional email", input: "2310112345@nurulfikri.ac.id", want: "2310112345@nurulfikri.ac.id"},
		{name: "non student email", input: "admin@example.com", want: "admin@example.com"},
		{name: "surrounding spaces", input: " 2310112345 ", want: "2310112345"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeLoginIdentifier(tt.input); got != tt.want {
				t.Fatalf("normalizeLoginIdentifier(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestIsValidLoginInput(t *testing.T) {
	if !isValidLoginInput("2310112345@nurulfikri.ac.id", "password") {
		t.Fatal("expected valid credentials input")
	}
	if !isValidLoginInput("kemahasiswaan", "password") {
		t.Fatal("expected bare account identifier to be valid")
	}
	if !isValidLoginInput("bem-sttnf", "password") {
		t.Fatal("expected role username to be valid")
	}
	if !isValidLoginInput("invalid-email", "password") {
		t.Fatal("expected bare identifier to be valid")
	}
	if isValidLoginInput("user@", "password") {
		t.Fatal("expected malformed email to be rejected")
	}
	if isValidLoginInput("user@example.com", "") {
		t.Fatal("expected empty password to be rejected")
	}
}
