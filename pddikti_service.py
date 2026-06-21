from flask import Flask, request, jsonify
from pddiktipy import api
import logging
import os

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)

ALLOWED_PT = (
    os.environ.get("PDDIKTI_ALLOWED_INSTITUTION")
    or os.environ.get("PDDIKTI_ALLOWED_INSTITUTIONS", "").split(",")[0]
    or "SEKOLAH TINGGI TEKNOLOGI TERPADU NURUL FIKRI"
).upper()

@app.route("/validate-nim/", methods=["GET"])
def validate_nim():
    nim = request.args.get("nim", "").strip()

    if not nim:
        return jsonify({"valid": False, "message": "NIM tidak boleh kosong"}), 400

    try:
        with api() as client:
            result = client.search_mahasiswa(nim)

        if not result:
            return jsonify({"valid": False, "message": "NIM Kmapus STT-NF tidak ditemukan di PDDikti"})

        normalized_nim = nim.upper()
        for mhs in result:
            if str(mhs.get("nim", "")).upper() == normalized_nim:
                nama_pt = mhs.get("nama_pt", "").upper()
                if ALLOWED_PT in nama_pt:
                    return jsonify({
                        "valid": True,
                        "nim": mhs["nim"],
                        "nama": mhs["nama"],
                        "nama_pt": mhs["nama_pt"],
                        "singkatan_pt": mhs.get("singkatan_pt") or mhs.get("sinkatan_pt", "STT-NF"),
                        "prodi": mhs["nama_prodi"],
                        "message": "Terverifikasi sebagai mahasiswa STT Nurul Fikri"
                    })
                else:
                    return jsonify({
                        "valid": False,
                        "nim": mhs.get("nim") or nim,
                        "nama": mhs.get("nama"),
                        "nama_pt": mhs.get("nama_pt"),
                        "prodi": mhs.get("nama_prodi"),
                        "message": "NIM valid, tapi bukan mahasiswa STT Nurul Fikri."
                    })

        return jsonify({"valid": False, "message": "NIM tidak ditemukan atau tidak sesuai"})

    except Exception as e:
        logging.error(f"Error validasi NIM {nim}: {e}")
        return jsonify({"valid": False, "message": "Gagal menghubungi PDDikti, coba lagi nanti"}), 503

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_PORT", "5001"))
    try:
        from waitress import serve
        logging.info(f"Starting production server (Waitress) on port {port}...")
        serve(app, host="0.0.0.0", port=port)
    except ImportError:
        logging.warning("Waitress not installed. Falling back to development Flask server...")
        app.run(host="0.0.0.0", port=port, debug=False)
