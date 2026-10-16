-keep class org.telegram.tgnet.** { *; }
-keepclassmembers class org.telegram.tgnet.** { *; }
-keepinterface org.telegram.tgnet.** { *; }
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}
