/****************************************************************************
 Copyright (c) 2024 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#if defined(__EMSCRIPTEN__)

#include <EGL/egl.h>
#include <GLES3/gl32.h>

// WebGL2 (GLES 3.0) does not support these GLES 3.1+ symbols.
// Provide no-op stubs so the linker can resolve them.

extern "C" {

void glTexStorage2DMultisample(GLenum target, GLsizei samples, GLenum internalformat, GLsizei width, GLsizei height, GLboolean fixedsamplelocations) {
    (void)target;
    (void)samples;
    (void)internalformat;
    (void)width;
    (void)height;
    (void)fixedsamplelocations;
}

void glTexStorage3DMultisample(GLenum target, GLsizei samples, GLenum internalformat, GLsizei width, GLsizei height, GLsizei depth, GLboolean fixedsamplelocations) {
    (void)target;
    (void)samples;
    (void)internalformat;
    (void)width;
    (void)height;
    (void)depth;
    (void)fixedsamplelocations;
}

void glGetProgramInterfaceiv(GLuint program, GLenum programInterface, GLenum pname, GLint *params) {
    (void)program;
    (void)programInterface;
    (void)pname;
    (void)params;
}

void glGetProgramResourceName(GLuint program, GLenum programInterface, GLuint index, GLsizei bufSize, GLsizei *length, GLchar *name) {
    (void)program;
    (void)programInterface;
    (void)index;
    (void)bufSize;
    (void)length;
    (void)name;
}

void glGetProgramResourceiv(GLuint program, GLenum programInterface, GLuint index, GLsizei propCount, const GLenum *props, GLsizei bufSize, GLsizei *length, GLint *params) {
    (void)program;
    (void)programInterface;
    (void)index;
    (void)propCount;
    (void)props;
    (void)bufSize;
    (void)length;
    (void)params;
}

void glBindImageTexture(GLuint unit, GLuint texture, GLint level, GLboolean layered, GLint layer, GLenum access, GLenum format) {
    (void)unit;
    (void)texture;
    (void)level;
    (void)layered;
    (void)layer;
    (void)access;
    (void)format;
}

void glDispatchCompute(GLuint num_groups_x, GLuint num_groups_y, GLuint num_groups_z) {
    (void)num_groups_x;
    (void)num_groups_y;
    (void)num_groups_z;
}

void glDispatchComputeIndirect(GLintptr indirect) {
    (void)indirect;
}

void glMemoryBarrier(GLbitfield barriers) {
    (void)barriers;
}

void glMemoryBarrierByRegion(GLbitfield barriers) {
    (void)barriers;
}

// EGL: Emscripten uses HTML5 canvas, pbuffer is not used. Provide stub.
EGLSurface eglCreatePbufferSurface(EGLDisplay dpy, EGLConfig config, const EGLint *attrib_list) {
    (void)dpy;
    (void)config;
    (void)attrib_list;
    return EGL_NO_SURFACE;
}

} // extern "C"

#endif // __EMSCRIPTEN__
