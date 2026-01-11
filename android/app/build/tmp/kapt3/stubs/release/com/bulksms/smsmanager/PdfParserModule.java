package com.bulksms.smsmanager;

/**
 * ============================================================
 * PdfParserModule — Native PDF Parser for M-Pesa Statements
 * ------------------------------------------------------------
 * Uses Apache PDFBox to parse password-protected PDF files
 * entirely on-device without any server communication.
 *
 * Features:
 * - Password-protected PDF decryption
 * - Text extraction from all pages
 * - Async processing to avoid UI blocking
 * - Memory-efficient streaming for large files
 * ============================================================
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000Z\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000b\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\b\u0003\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0012\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0004\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0007\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u0010\u0010\t\u001a\u00020\n2\u0006\u0010\u000b\u001a\u00020\nH\u0002J0\u0010\f\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\n2\u0006\u0010\u000f\u001a\u00020\n2\u0006\u0010\u0010\u001a\u00020\u00112\u0006\u0010\u0012\u001a\u00020\u00112\u0006\u0010\u0013\u001a\u00020\u0014H\u0007J\u0018\u0010\u0015\u001a\u00020\n2\u0006\u0010\u0016\u001a\u00020\u00172\u0006\u0010\u000f\u001a\u00020\nH\u0002J\u0018\u0010\u0018\u001a\u00020\n2\u0006\u0010\u0019\u001a\u00020\u001a2\u0006\u0010\u000f\u001a\u00020\nH\u0002J\b\u0010\u001b\u001a\u00020\nH\u0016J \u0010\u001c\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\n2\u0006\u0010\u000f\u001a\u00020\n2\u0006\u0010\u0013\u001a\u00020\u0014H\u0007J\u001c\u0010\u001d\u001a\u00020\r2\n\u0010\u001e\u001a\u00060\u001fj\u0002` 2\u0006\u0010\u0013\u001a\u00020\u0014H\u0002J\b\u0010!\u001a\u00020\rH\u0002J\u0018\u0010\"\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\n2\u0006\u0010\u0013\u001a\u00020\u0014H\u0007J\b\u0010#\u001a\u00020\rH\u0016J \u0010$\u001a\u00020\r2\u0006\u0010\u000e\u001a\u00020\n2\u0006\u0010\u000f\u001a\u00020\n2\u0006\u0010\u0013\u001a\u00020\u0014H\u0007J \u0010%\u001a\u00020\r2\u0006\u0010&\u001a\u00020\n2\u0006\u0010\u000f\u001a\u00020\n2\u0006\u0010\u0013\u001a\u00020\u0014H\u0007R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\bX\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\'"}, d2 = {"Lcom/bulksms/smsmanager/PdfParserModule;", "Lcom/facebook/react/bridge/ReactContextBaseJavaModule;", "reactContext", "Lcom/facebook/react/bridge/ReactApplicationContext;", "(Lcom/facebook/react/bridge/ReactApplicationContext;)V", "isInitialized", "", "scope", "Lkotlinx/coroutines/CoroutineScope;", "cleanFilePath", "", "path", "extractPageRange", "", "filePath", "password", "startPage", "", "endPage", "promise", "Lcom/facebook/react/bridge/Promise;", "extractTextFromBytes", "pdfBytes", "", "extractTextFromPdf", "file", "Ljava/io/File;", "getName", "getPdfMetadata", "handlePdfException", "e", "Ljava/lang/Exception;", "Lkotlin/Exception;", "initializePdfBox", "isPasswordProtected", "onCatalystInstanceDestroy", "parsePdf", "parsePdfFromBase64", "base64Data", "app_release"})
public final class PdfParserModule extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.CoroutineScope scope = null;
    private boolean isInitialized = false;
    
    public PdfParserModule(@org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.ReactApplicationContext reactContext) {
        super();
    }
    
    private final void initializePdfBox() {
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String getName() {
        return null;
    }
    
    /**
     * Parse a PDF file and extract text content
     *
     * @param filePath - Path to the PDF file (can be file:// URI or absolute path)
     * @param password - Password for encrypted PDF (empty string for unencrypted)
     * @param promise - React Native promise to resolve/reject
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void parsePdf(@org.jetbrains.annotations.NotNull()
    java.lang.String filePath, @org.jetbrains.annotations.NotNull()
    java.lang.String password, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * Parse a PDF from base64 encoded data
     *
     * @param base64Data - Base64 encoded PDF content
     * @param password - Password for encrypted PDF
     * @param promise - React Native promise
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void parsePdfFromBase64(@org.jetbrains.annotations.NotNull()
    java.lang.String base64Data, @org.jetbrains.annotations.NotNull()
    java.lang.String password, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * Check if a PDF file is password protected
     *
     * @param filePath - Path to the PDF file
     * @param promise - React Native promise
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void isPasswordProtected(@org.jetbrains.annotations.NotNull()
    java.lang.String filePath, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * Get PDF metadata (page count, title, author, etc.)
     *
     * @param filePath - Path to the PDF file
     * @param password - Password if encrypted
     * @param promise - React Native promise
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void getPdfMetadata(@org.jetbrains.annotations.NotNull()
    java.lang.String filePath, @org.jetbrains.annotations.NotNull()
    java.lang.String password, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    /**
     * Extract text from a specific page range
     *
     * @param filePath - Path to the PDF file
     * @param password - Password if encrypted
     * @param startPage - Starting page (1-indexed)
     * @param endPage - Ending page (1-indexed)
     * @param promise - React Native promise
     */
    @com.facebook.react.bridge.ReactMethod()
    public final void extractPageRange(@org.jetbrains.annotations.NotNull()
    java.lang.String filePath, @org.jetbrains.annotations.NotNull()
    java.lang.String password, int startPage, int endPage, @org.jetbrains.annotations.NotNull()
    com.facebook.react.bridge.Promise promise) {
    }
    
    private final java.lang.String cleanFilePath(java.lang.String path) {
        return null;
    }
    
    private final java.lang.String extractTextFromPdf(java.io.File file, java.lang.String password) {
        return null;
    }
    
    private final java.lang.String extractTextFromBytes(byte[] pdfBytes, java.lang.String password) {
        return null;
    }
    
    private final void handlePdfException(java.lang.Exception e, com.facebook.react.bridge.Promise promise) {
    }
    
    @java.lang.Override()
    public void onCatalystInstanceDestroy() {
    }
}