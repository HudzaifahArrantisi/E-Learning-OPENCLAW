package controllers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLookupPDDiktiStudentReportsNotAllowedForKnownNonAllowedStudent(t *testing.T) {
	const nim = "12345678"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("nim"); got != nim {
			t.Fatalf("query nim = %q, want %q", got, nim)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"valid":false,"nama_pt":"Universitas Lain","message":"NIM terdaftar di Universitas Lain, bukan STT Nurul Fikri"}`))
	}))
	defer server.Close()

	t.Setenv("PDDIKTI_VERIFY_URL", server.URL+"/validate-nim")

	_, err := lookupPDDiktiStudent(context.Background(), nim)
	if !errors.Is(err, errPDDiktiNotAllowed) {
		t.Fatalf("lookupPDDiktiStudent error = %v, want %v", err, errPDDiktiNotAllowed)
	}
}

func TestLookupPDDiktiStudentKeepsUnknownNIMAsNotFound(t *testing.T) {
	const nim = "12345678"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"valid":false,"message":"NIM tidak ditemukan di PDDikti."}`))
	}))
	defer server.Close()

	t.Setenv("PDDIKTI_VERIFY_URL", server.URL+"/validate-nim")

	_, err := lookupPDDiktiStudent(context.Background(), nim)
	if !errors.Is(err, errPDDiktiNotFound) {
		t.Fatalf("lookupPDDiktiStudent error = %v, want %v", err, errPDDiktiNotFound)
	}
}
