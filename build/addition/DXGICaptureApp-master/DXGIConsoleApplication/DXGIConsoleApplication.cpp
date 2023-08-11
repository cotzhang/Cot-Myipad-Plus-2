// DXGIConsoleApplication.cpp : Defines the entry point for the console application.
//

#include "DuplicationManager.h"
#include <time.h>
#include <jpeglib.h> // Include the libjpeg header
#include <iostream>
using namespace std;

#ifdef _WIN32
#include <io.h>
#include <fcntl.h>
#endif

clock_t start = 0, stop = 0, duration = 0;
int count = 0;
FILE* log_file;
char file_name[MAX_PATH];


void save_as_jpeg(unsigned char* bitmap_data, int rowPitch, int height)
{
    // Create a memory buffer for the JPEG data
    unsigned char* jpeg_data = nullptr;
    unsigned long jpeg_size = 0;

    struct jpeg_compress_struct cinfo;
    struct jpeg_error_mgr jerr;

    // Step 1: Allocate and initialize JPEG compression object
    cinfo.err = jpeg_std_error(&jerr);
    jpeg_create_compress(&cinfo);

    // Step 2: Set up destination for the JPEG data
    jpeg_mem_dest(&cinfo, &jpeg_data, &jpeg_size);

    // Step 3: Set JPEG compression parameters
    cinfo.image_width = rowPitch / 4;
    cinfo.image_height = height;
    cinfo.input_components = 4; // RGBA format
    cinfo.in_color_space = JCS_EXT_BGRA; // Indicate that the input data is in RGB color space

    jpeg_set_defaults(&cinfo);
    jpeg_set_quality(&cinfo, 100, TRUE); // Adjust quality as needed

    // Step 4: Start compression
    jpeg_start_compress(&cinfo, TRUE);

    // Step 5: Compress each scanline
    JSAMPROW row_pointer[1];
    while (cinfo.next_scanline < cinfo.image_height)
    {
        row_pointer[0] = &bitmap_data[cinfo.next_scanline * rowPitch];
        jpeg_write_scanlines(&cinfo, row_pointer, 1);
    }

    // Step 6: Finish compression
    jpeg_finish_compress(&cinfo);


    // Step 7: Clean up
    jpeg_destroy_compress(&cinfo);

    // Write the JPEG data to stdout
    fwrite("--ffmpeg\r\nContent-type: image/jpeg\r\n\r\n", 1, 38, stdout);
    fwrite(jpeg_data, 1, jpeg_size, stdout);
    fwrite("\r\n", 1, 38, stdout);

    // Clean up memory
    free(jpeg_data);
}

int main()
{
#ifdef _WIN32
    _setmode(_fileno(stdout), O_BINARY);
    _setmode(_fileno(stdin), O_BINARY);
#endif
    fopen_s(&log_file, "logY.txt", "w");

    DUPLICATIONMANAGER DuplMgr;
    DUPL_RETURN Ret;

    UINT Output = 0;

    // Make duplication manager
    Ret = DuplMgr.InitDupl(log_file, Output);
    if (Ret != DUPL_RETURN_SUCCESS)
    {
        fprintf_s(log_file, "Duplication Manager couldn't be initialized.");
        return 0;
    }

    BYTE* pBuf = new BYTE[10000000];

    // Main duplication loop
    while(1)
    {
        int time_0 = GetTickCount();
        for (int i = 0; i < 30; i++)
        {
            // Get new frame from desktop duplication
            Ret = DuplMgr.GetFrame(pBuf);
            if (Ret != DUPL_RETURN_SUCCESS)
            {
                fprintf_s(log_file, "Could not get the frame.");
            }

            // Convert to JPEG and write to stdout
            save_as_jpeg(pBuf, DuplMgr.GetImagePitch(), DuplMgr.GetImageHeight());
        }
        printf("Framerate: ", (double)(30) / (double)((GetTickCount() - time_0) * 1000));
    }

    delete[] pBuf;

    fclose(log_file);
    return 0;
}
