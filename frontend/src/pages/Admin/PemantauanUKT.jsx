import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import useAuth from '../../hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Container,
  useTheme,
  useMediaQuery,
  Divider,
  CircularProgress,
  Fab,
} from '@mui/material';

// Ikon MUI
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import PaidIcon from '@mui/icons-material/Paid';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptIcon from '@mui/icons-material/Receipt';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const PemantauanUKT = () => {
  const { user } = useAuth();
  const [selectedMahasiswa, setSelectedMahasiswa] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [riwayatDialogOpen, setRiwayatDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Query data UKT
  const {
    data: uktData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['uktMahasiswa', refreshKey],
    queryFn: async () => {
      try {
        const response = await api.get('/api/admin/ukt/mahasiswa');
        return response.data.data;
      } catch (err) {
        throw new Error(err.response?.data?.message || 'Gagal mengambil data UKT');
      }
    },
    refetchInterval: 30000,
    enabled: user?.role === 'admin',
    retry: 1,
  });

  // Query riwayat pembayaran
  const {
    data: riwayatData,
    isLoading: riwayatLoading,
  } = useQuery({
    queryKey: ['riwayatPembayaran', selectedMahasiswa?.id],
    queryFn: async () => {
      if (!selectedMahasiswa?.id) return [];
      try {
        const response = await api.get(`/api/admin/ukt/riwayat/${selectedMahasiswa.id}`);
        return response.data.data;
      } catch (err) {
        return [];
      }
    },
    enabled: !!selectedMahasiswa?.id && riwayatDialogOpen,
  });

  const handleOpenDetail = (mahasiswa) => {
    setSelectedMahasiswa(mahasiswa);
    setDetailDialogOpen(true);
  };

  const handleOpenRiwayat = (mahasiswa) => {
    setSelectedMahasiswa(mahasiswa);
    setRiwayatDialogOpen(true);
  };

  const handleSendReminder = async (mahasiswaId) => {
    try {
      await api.post(`/api/admin/ukt/reminder/${mahasiswaId}`);
      alert('Reminder berhasil dikirim!');
    } catch (error) {
      alert('Gagal mengirim reminder');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'LUNAS':
        return 'success';
      case 'SEBAGIAN':
        return 'warning';
      case 'BELUM BAYAR':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Cek akses admin kemahasiswaan
  const isKemahasiswaanAdmin = user?.email === 'kemahasiswaan@nurulfikri.ac.id';

  if (!isKemahasiswaanAdmin) {
    return (
      <div className="flex">
        <Sidebar role="admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content flex-1" style={{ marginLeft: 0, paddingLeft: 0 }}>
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
          <Container maxWidth="xl" sx={{ p: 3, pl: 0, pr: 3 }}>
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                borderLeft: '5px solid #d32f2f',
                bgcolor: '#fff',
              }}
            >
              <Typography variant="h6" fontWeight="bold" color="#d32f2f">
                🔒 Akses Ditolak!
              </Typography>
              <Typography mt={1}>
                Hanya Admin Kemahasiswaan yang dapat mengakses halaman ini.
                <br />
                Anda login sebagai: <strong>{user?.name || user?.email}</strong>
              </Typography>
            </Alert>
          </Container>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex">
        <Sidebar role="admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content flex-1" style={{ marginLeft: 0, paddingLeft: 0 }}>
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
          <Container maxWidth="xl" sx={{ p: 3, pl: 0, pr: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <CircularProgress size={60} color="primary" thickness={4} />
            <Typography variant="h6" mt={2} fontWeight="medium" color="text.primary">
              Memuat data UKT mahasiswa...
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Harap tunggu sebentar
            </Typography>
          </Container>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex">
        <Sidebar role="admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="main-content flex-1" style={{ marginLeft: 0, paddingLeft: 0 }}>
          <Navbar user={user} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
          <Container maxWidth="xl" sx={{ p: 3, pl: 0, pr: 3 }}>
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                bgcolor: '#fff',
              }}
            >
              <Typography variant="h6" fontWeight="bold">⚠️ Error!</Typography>
              <Typography>{error.message || 'Gagal memuat data UKT'}</Typography>
            </Alert>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              color="primary"
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                },
              }}
            >
              Muat Ulang Data
            </Button>
          </Container>
        </div>
      </div>
    );
  }

  const { mahasiswa = [], statistik } = uktData || {};

  return (
    <div className="flex">
      <Sidebar role="admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Main Content - Menempel ke sidebar */}
      <div className="main-content flex-1" style={{ marginLeft: 0, paddingLeft: 0 }}>
        <Navbar user={user} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <Container
          maxWidth="xl"
          sx={{
            p: 3,
            pl: 0,
            pr: 3,
            transition: 'all 0.3s ease',
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              gap: 2,
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              <PaidIcon fontSize="large" color="primary" />
              Pemantauan UKT Mahasiswa
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              color="primary"
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                },
                minWidth: 140,
              }}
            >
              Refresh Data
            </Button>
          </Box>

          {/* Statistik Cards - Modern Glassmorphism */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              {
                title: 'Total Mahasiswa',
                value: statistik?.total_mahasiswa || 0,
                icon: <PeopleIcon fontSize="large" />,
                gradient: 'linear-gradient(135deg, #3498db, #2980b9)',
                bg: 'rgba(52, 152, 219, 0.1)',
                border: '1px solid rgba(52, 152, 219, 0.2)',
              },
              {
                title: 'Lunas',
                value: statistik?.total_lunas || 0,
                icon: <CheckCircleIcon fontSize="large" />,
                gradient: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                bg: 'rgba(46, 204, 113, 0.1)',
                border: '1px solid rgba(46, 204, 113, 0.2)',
              },
              {
                title: 'Sebagian',
                value: statistik?.total_sebagian || 0,
                icon: <PendingIcon fontSize="large" />,
                gradient: 'linear-gradient(135deg, #f39c12, #e67e22)',
                bg: 'rgba(243, 156, 18, 0.1)',
                border: '1px solid rgba(243, 156, 18, 0.2)',
              },
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    background: stat.bg,
                    border: stat.border,
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    },
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      {React.cloneElement(stat.icon, { sx: { color: stat.gradient.split(',')[0].replace(')', '') } })}
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 'bold',
                        textAlign: 'right',
                        fontSize: '1.2rem',
                        color: stat.gradient.split(',')[0].replace(')', ''),
                      }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 'medium',
                      color: 'text.secondary',
                    }}
                  >
                    {stat.title}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Tabel Data Mahasiswa - Modern & Clean */}
          <Card
            sx={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  sx={{
                    color: '#2c3e50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <ReceiptIcon fontSize="small" />
                  Data UKT Semua Mahasiswa ({mahasiswa.length})
                </Typography>
              </Box>
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 2,
                  boxShadow: 'none',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <Table
                  sx={{
                    minWidth: 650,
                    '& .MuiTableCell-head': {
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6',
                      padding: '12px 16px',
                    },
                    '& .MuiTableRow-root:hover': {
                      backgroundColor: 'rgba(0,0,0,0.02)',
                    },
                    '& .MuiTableCell-body': {
                      padding: '12px 16px',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Nama</TableCell>
                      <TableCell>NIM</TableCell>
                      <TableCell>Sisa UKT</TableCell>
                      <TableCell>Sudah Dibayar</TableCell>
                      <TableCell>Persentase</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mahasiswa.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary" variant="body1">
                            🚫 Tidak ada data mahasiswa
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      mahasiswa.map((item) => (
                        <TableRow
                          key={item.id || item.nim}
                          hover
                          sx={{
                            '&:nth-of-type(even)': {
                              backgroundColor: 'rgba(0,0,0,0.01)',
                            },
                          }}
                        >
                          <TableCell>
                            <Typography fontWeight="medium">{item.nama}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {item.nim}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              color={item.sisa_ukt > 0 ? 'error' : 'success'}
                              fontWeight="bold"
                            >
                              {formatRupiah(item.sisa_ukt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography color="success.main" fontWeight="medium">
                              {formatRupiah(item.sudah_dibayar)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={parseFloat(item.persentase) || 0}
                                  color={
                                    parseFloat(item.persentase) === 100
                                      ? 'success'
                                      : parseFloat(item.persentase) > 50
                                      ? 'warning'
                                      : 'error'
                                  }
                                  sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 3,
                                    },
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight="bold" fontSize="0.85rem">
                                {item.persentase || '0%'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={item.status_bayar}
                              color={getStatusColor(item.status_bayar)}
                              size="small"
                              sx={{
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                minWidth: 80,
                                textAlign: 'center',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Lihat Detail" arrow placement="top">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDetail(item)}
                                  sx={{
                                    color: 'primary.main',
                                    '&:hover': {
                                      bgcolor: 'primary.light',
                                      color: 'white',
                                    },
                                    borderRadius: 1.5,
                                    p: 0.75,
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Riwayat Pembayaran" arrow placement="top">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenRiwayat(item)}
                                  sx={{
                                    color: 'info.main',
                                    '&:hover': {
                                      bgcolor: 'info.light',
                                      color: 'white',
                                    },
                                    borderRadius: 1.5,
                                    p: 0.75,
                                  }}
                                >
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {item.status_bayar !== 'LUNAS' && (
                                <Tooltip title="Kirim Reminder" arrow placement="top">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleSendReminder(item.id)}
                                    sx={{
                                      color: 'warning.main',
                                      '&:hover': {
                                        bgcolor: 'warning.light',
                                        color: 'white',
                                      },
                                      borderRadius: 1.5,
                                      p: 0.75,
                                    }}
                                  >
                                    <NotificationsActiveIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Dialog Detail Mahasiswa */}
          <Dialog
            open={detailDialogOpen}
            onClose={() => setDetailDialogOpen(false)}
            maxWidth="md"
            fullWidth
            scroll="paper"
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                bgcolor: 'background.paper',
              },
            }}
          >
            <DialogTitle
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon />
                Detail UKT - {selectedMahasiswa?.nama}
              </Box>
              <IconButton
                onClick={() => setDetailDialogOpen(false)}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
              {selectedMahasiswa && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        NIM
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ wordBreak: 'break-all' }}>
                        {selectedMahasiswa.nim}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        Total UKT
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="primary.main">
                        {formatRupiah(selectedMahasiswa.total_ukt || 7000000)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        Sudah Dibayar
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {formatRupiah(selectedMahasiswa.sudah_dibayar)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        Sisa UKT
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={selectedMahasiswa.sisa_ukt > 0 ? 'error.main' : 'success.main'}
                      >
                        {formatRupiah(selectedMahasiswa.sisa_ukt)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium" gutterBottom>
                        Persentase Pembayaran
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={parseFloat(selectedMahasiswa.persentase) || 0}
                            color={
                              parseFloat(selectedMahasiswa.persentase) === 100
                                ? 'success'
                                : parseFloat(selectedMahasiswa.persentase) > 50
                                ? 'warning'
                                : 'error'
                            }
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                              },
                            }}
                          />
                        </Box>
                        <Typography variant="h6" fontWeight="bold">
                          {selectedMahasiswa.persentase || '0%'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" fontWeight="medium">
                        Status
                      </Typography>
                      <Chip
                        label={selectedMahasiswa.status_bayar}
                        color={getStatusColor(selectedMahasiswa.status_bayar)}
                        sx={{
                          mt: 1,
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                          px: 2,
                          py: 0.75,
                          borderRadius: 2,
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setDetailDialogOpen(false)}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  px: 3,
                }}
              >
                Tutup
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog Riwayat Pembayaran */}
          <Dialog
            open={riwayatDialogOpen}
            onClose={() => setRiwayatDialogOpen(false)}
            maxWidth="lg"
            fullWidth
            scroll="paper"
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                bgcolor: 'background.paper',
              },
            }}
          >
            <DialogTitle
              sx={{
                bgcolor: 'info.main',
                color: 'white',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <HistoryIcon />
                Riwayat Pembayaran - {selectedMahasiswa?.nama}
              </Box>
              <IconButton
                onClick={() => setRiwayatDialogOpen(false)}
                sx={{ color: 'white' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3 }}>
              {riwayatLoading ? (
                <Box
                  sx={{
                    p: 4,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CircularProgress color="info" />
                  <Typography>Memuat riwayat pembayaran...</Typography>
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                    boxShadow: 'none',
                    border: '1px solid #dee2e6',
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Tanggal</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Metode</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Nominal</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Biaya Admin</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Total</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Status</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {riwayatData && riwayatData.length > 0 ? (
                        riwayatData.map((item) => (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              {item.tanggal
                                ? new Date(item.tanggal).toLocaleDateString('id-ID')
                                : '-'}
                            </TableCell>
                            <TableCell>{item.metode || '-'}</TableCell>
                            <TableCell>{formatRupiah(item.nominal)}</TableCell>
                            <TableCell>{formatRupiah(item.biaya_admin)}</TableCell>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {formatRupiah(item.total_dibayar)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.status}
                                size="small"
                                color={
                                  item.status === 'success'
                                    ? 'success'
                                    : item.status === 'pending'
                                    ? 'warning'
                                    : 'error'
                                }
                                sx={{
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1.5,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography color="text.secondary">
                              📝 Belum ada riwayat pembayaran
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setRiwayatDialogOpen(false)}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'bold',
                  px: 3,
                }}
              >
                Tutup
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </div>
    </div>
  );
};

export default PemantauanUKT;
